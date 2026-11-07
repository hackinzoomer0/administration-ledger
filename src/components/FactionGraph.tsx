import { useMemo } from "react";
import { Box } from "@mui/material";
import { Background, Controls, ReactFlow } from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";
import { useNavigate } from "react-router-dom";
import { activeFactions, data } from "../lib/data";
import "@xyflow/react/dist/style.css";

const aliases: Record<string, string> = {
  operation: "operation",
  maximalist: "maximalists",
  treasury: "treasury",
  "deal-capital": "deal-capital",
  "tech-right": "tech-right",
  "vance lane": "vance",
  hawk: "hawks",
  pentagon: "pentagon",
  dissenter: "dissenters",
  "party machine": "party",
};
export function FactionGraph() {
  const navigate = useNavigate();
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = activeFactions.map((faction, index) => ({
      id: faction.id,
      position: { x: (index % 3) * 270, y: Math.floor(index / 3) * 160 },
      data: { label: faction.short },
      style: {
        background: "#fff",
        borderColor: "#215c63",
        borderRadius: 8,
        padding: 12,
        width: 190,
      },
      ariaLabel: `Open ${faction.name}`,
    }));
    const dynamics = data.meta.dynamics as { edges?: string[][] };
    const edges: Edge[] = (dynamics.edges ?? [])
      .slice(1)
      .flatMap((row, index) => {
        const ends = row[0]
          .toLowerCase()
          .split(" and ")
          .map(
            (part) =>
              Object.entries(aliases).find(([alias]) =>
                part.includes(alias),
              )?.[1],
          );
        if (
          !ends[0] ||
          !ends[1] ||
          !nodes.some((node) => node.id === ends[0]) ||
          !nodes.some((node) => node.id === ends[1])
        )
          return [];
        return [
          {
            id: `relationship-${index}`,
            source: ends[0],
            target: ends[1],
            label: row[1],
            style: {
              stroke: row[1] === "Feud" ? "#b25b44" : "#63898d",
              strokeDasharray: row[1] === "Feud" ? "5 4" : undefined,
            },
            labelStyle: { fontSize: 10 },
            ariaLabel: `${row[0]}: ${row[1]}`,
          },
        ];
      });
    return { nodes, edges };
  }, []);
  return (
    <Box
      sx={{
        height: { xs: 380, md: 480 },
        border: 1,
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeClick={(_, node) => navigate(`/factions/${node.id}`)}
        minZoom={0.3}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </Box>
  );
}
