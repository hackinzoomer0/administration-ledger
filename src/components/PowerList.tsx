import { Box, Button, Chip, Divider, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { data, issueNames } from "../lib/data";
import { useEvidence } from "../lib/evidence-context";
import { ReadingBlock } from "./ReadingBlock";
import type { PowerContest } from "../lib/types";
export function PowerList({
  compact = false,
  contests = data.assessment.administration.contests,
}: {
  compact?: boolean;
  contests?: PowerContest[];
}) {
  const evidence = useEvidence();
  return (
    <Stack divider={<Divider />} spacing={compact ? 1.5 : 3}>
      {contests.map((contest) => (
        <Box key={contest.id}>
          <Stack
            direction="row"
            sx={{
              justifyContent: "space-between",
              alignItems: "start",
              gap: 1,
            }}
          >
            <Typography
              component={RouterLink}
              to={`/administration/${contest.id}`}
              variant="subtitle1"
              sx={{
                color: "text.primary",
                fontWeight: 650,
                textDecoration: "none",
                "&:hover": { color: "primary.main" },
              }}
            >
              {contest.title}
            </Typography>
            <Chip
              size="small"
              label={
                {
                  pending: "Pending outcome",
                  contested: "Contested",
                  strengthening: "Strengthening",
                  weakening: "Weakening",
                  unchanged: "Unchanged",
                  not_reviewed: "Not reviewed",
                }[contest.status]
              }
              variant="outlined"
              color={contest.status === "pending" ? "default" : "secondary"}
            />
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, maxWidth: "72ch" }}
          >
            {compact ? contest.summary : contest.assessment}
          </Typography>
          {!compact && (
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <ReadingBlock title="Who decides" text={contest.authority} />
              <ReadingBlock title="Who has leverage" text={contest.leverage} />
              <ReadingBlock
                title="What would change this read"
                text={contest.watch}
              />
            </Stack>
          )}
          <Stack direction="row" sx={{ gap: 1, mt: 0.5 }}>
            <Button
              size="small"
              onClick={() =>
                evidence({
                  title: contest.title,
                  summary: contest.assessment,
                  event_ids: contest.event_ids,
                })
              }
            >
              View basis
            </Button>
            {!compact && (
              <Button
                size="small"
                component={RouterLink}
                to={`/issues/${contest.issue_id}`}
              >
                {issueNames[contest.issue_id]} record
              </Button>
            )}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
