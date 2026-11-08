"""Run a ledger review in a fresh chat on the local Codex Remote daemon."""
import base64
import json
import os
import socket
import sys
from pathlib import Path
from usage import UsageRecorder


def main():
    stage, section = sys.argv[1:]
    prompt = sys.stdin.read()
    path = Path.home() / ".codex/app-server-control/app-server-control.sock"
    with socket.socket(socket.AF_UNIX) as connection:
        connection.settimeout(2400)
        connection.connect(str(path))
        key = base64.b64encode(os.urandom(16)).decode()
        connection.sendall((
            "GET / HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\n"
            "Connection: Upgrade\r\nSec-WebSocket-Version: 13\r\n"
            f"Sec-WebSocket-Key: {key}\r\n\r\n"
        ).encode())
        with connection.makefile("rb") as stream:
            if stream.readline().split()[1:2] != [b"101"]:
                raise RuntimeError("Codex daemon refused the WebSocket upgrade")
            for line in stream:
                if line == b"\r\n":
                    break
            usage = UsageRecorder(stage, section)
            try:
                run_chat(connection, stream, stage, section, prompt, usage)
            except Exception:
                usage.finish('transport_or_turn_failed')
                raise


def run_chat(connection, stream, stage, section, prompt, usage=None):
    usage = usage or UsageRecorder(stage, section)

    def send_frame(payload, opcode=1):
        size = len(payload)
        if size < 126:
            length = bytes([128 | size])
        elif size < 65536:
            length = b"\xfe" + size.to_bytes(2, "big")
        else:
            length = b"\xff" + size.to_bytes(8, "big")
        mask = os.urandom(4)
        encoded = bytes(byte ^ mask[index % 4] for index, byte in enumerate(payload))
        connection.sendall(bytes([128 | opcode]) + length + mask + encoded)

    def receive():
        while True:
            header = stream.read(2)
            if len(header) != 2:
                raise RuntimeError("Codex daemon disconnected")
            opcode, size = header
            if size in (126, 127):
                size = int.from_bytes(stream.read(2 if size == 126 else 8), "big")
            payload = stream.read(size)
            if opcode == 0x89:
                send_frame(payload, 10)
            elif opcode == 0x81:
                message = json.loads(payload)
                usage.observe(message)
                return message
            else:
                raise RuntimeError(f"Unexpected WebSocket frame: {opcode:#x}")

    def call(method, params, request_id=None):
        message = {"method": method, "params": params}
        if request_id is not None:
            message["id"] = request_id
        send_frame(json.dumps(message).encode())
        if request_id is None:
            return
        while True:
            response = receive()
            if response.get("id") == request_id:
                if "error" in response:
                    raise RuntimeError(f"{method}: {response['error']}")
                return response["result"]

    call("initialize", {"clientInfo": {"name": "ledger-cli", "version": "1.0"}}, 1)
    call("initialized", {})
    metadata = Path(stage) / "chat.json"
    if section == "report":
        thread_id = json.loads(metadata.read_text())["threadId"]
        call("thread/resume", {"threadId": thread_id, "cwd": stage}, 2)
    else:
        result = call("thread/start", {
            "cwd": stage,
            "sandbox": "workspace-write",
            "approvalPolicy": "never",
            "config": {"web_search": "live"},
        }, 2)
        thread_id = result["thread"]["id"]
        metadata.write_text(json.dumps({"threadId": thread_id}))
        print(f"Codex chat: {thread_id}", flush=True)
        call("thread/name/set", {"threadId": thread_id, "name": f"Ledger {section.lower()} review"}, 3)
    turn = call("turn/start", {
        "threadId": thread_id,
        "input": [{"type": "text", "text": prompt, "text_elements": []}],
    }, 4)["turn"]
    while True:
        message = receive()
        if message.get("method") != "turn/completed":
            continue
        params = message["params"]
        if params["threadId"] == thread_id and params["turn"]["id"] == turn["id"]:
            if params["turn"]["status"] != "completed":
                raise RuntimeError(f"Codex turn failed: {params['turn']}")
            usage.finish("completed")
            return


if __name__ == "__main__":
    main()
