import type { ReactNode } from "react";
import { Box, Divider, Stack, Typography } from "@mui/material";
import { data } from "../lib/data";
import { label } from "../lib/selectors";
import type { Candidate } from "../lib/types";
import { Section } from "./Section";
import { ResearchText } from "./ResearchText";

export function CandidatePositions({
  candidate,
  sourceButton,
}: {
  candidate: Candidate;
  sourceButton: (title: string, ids: string[], summary?: string) => ReactNode;
}) {
  return (
    <Section
      title="Policy positions and the record behind them"
      description="A statement, an action and a projected campaign commitment are distinguished. No formal campaign platform is assumed."
    >
      <Stack spacing={3} divider={<Divider />}>
        {Object.entries(candidate.positions).map(([key, position]) => (
          <Box key={key}>
            <Typography variant="subtitle1" sx={{ fontWeight: 650, mb: 1 }}>
              {data.nomination.issue_definitions.find((row) => row.id === key)
                ?.label ?? label(key)}
            </Typography>
            <ResearchText text={position.summary} />
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              {position.evidence.map((raw, index) => {
                const row = raw as {
                  text: string;
                  status: string;
                  source_ids: string[];
                };
                return (
                  <Box
                    key={index}
                    sx={{ borderLeft: 2, borderColor: "divider", pl: 2 }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {label(row.status)}
                    </Typography>
                    <ResearchText text={row.text} />
                    {row.source_ids.length > 0 &&
                      sourceButton(
                        `${candidate.name}: policy evidence`,
                        row.source_ids,
                        row.text,
                      )}
                  </Box>
                );
              })}
            </Stack>
            {position.uncertainty &&
              !position.uncertainty.startsWith(
                "This is not a complete 2028 platform",
              ) && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1 }}
                >
                  {position.uncertainty}
                </Typography>
              )}
          </Box>
        ))}
      </Stack>
    </Section>
  );
}
