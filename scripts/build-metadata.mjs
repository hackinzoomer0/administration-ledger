import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? files(`${directory}/${entry.name}`)
        : [`${directory}/${entry.name}`],
    ),
  );
  return nested
    .flat()
    .filter((path) => path.endsWith(".json"))
    .sort();
}
const digest = createHash("sha256");
for (const path of await files("database")) {
  digest.update(path);
  digest.update(await readFile(path));
}
const commit =
  process.env.GITHUB_SHA ||
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
await writeFile(
  "dist/version.json",
  JSON.stringify({
    commit,
    database_hash: digest.digest("hex"),
    built_at: new Date().toISOString(),
  }) + "\n",
);
