import { Box } from "@mui/material";
import { Background, Controls, ReactFlow } from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";
import { useNavigate } from "react-router-dom";
import { data, factionNames } from "../lib/data";
import "@xyflow/react/dist/style.css";
export function FactionGraph({ issue = "" }: { issue?: string }) {
  const navigate = useNavigate();
  const relations = data.assessment.relationships.filter(
    (row) => !issue || row.issues.includes(issue),
  );
  const ids = [
    ...new Set(relations.flatMap((row) => [row.source, row.target])),
  ];
  const nodes: Node[] = ids.map((id, index) => ({
    id,
    position: { x: (index % 2) * 330, y: Math.floor(index / 2) * 150 },
    data: { label: factionNames[id] },
    style: {
      background: "#fff",
      borderColor: "#245b5b",
      borderRadius: 8,
      padding: 12,
      width: 220,
    },
    ariaLabel: `Open ${factionNames[id]}`,
  }));
  const edges: Edge[] = relations.map((row) => ({
    id: row.id,
    source: row.source,
    target: row.target,
    label: row.kind,
    labelStyle: { fontSize: 11 },
    style: {
      stroke: row.kind === "Competing positions" ? "#92582d" : "#597f7f",
    },
    ariaLabel: `${factionNames[row.source]} and ${factionNames[row.target]}: ${row.kind}`,
  }));
  return (
    <Box
      sx={{ height: 380, border: 1, borderColor: "divider", borderRadius: 1 }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeClick={(_, node) => navigate(`/factions/${node.id}`)}
        fitViewOptions={{ padding: 0.25 }}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </Box>
  );
}
