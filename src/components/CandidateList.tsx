import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { data } from "../lib/data";
import { substantiveSnapshots } from "../lib/selectors";
import { useEvidence } from "../lib/evidence-context";
export function CandidateList({ compact = false }: { compact?: boolean }) {
  const evidence = useEvidence();
  const latest = substantiveSnapshots(data.nomination.tracking.history).at(-1);
  return (
    <Stack spacing={compact ? 1.5 : 2} divider={<Divider />}>
      <Typography variant="caption" color="text.secondary">
        Subjective shares within the five-candidate field.
      </Typography>
      {[...data.nomination.candidates]
        .sort(
          (a, b) => b.nomination_likelihood_pct - a.nomination_likelihood_pct,
        )
        .map((candidate, index) => {
          const read = data.assessment.nomination.candidates.find(
            (row) => row.candidate_id === candidate.id,
          )!;
          const delta = latest?.assessments[candidate.id]?.delta_pp;
          return (
            <Box key={candidate.id}>
              <Stack
                direction="row"
                sx={{
                  gap: 2,
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <Typography
                  component={RouterLink}
                  to={`/nominees/${candidate.id}`}
                  aria-label={candidate.name}
                  variant="subtitle1"
                  sx={{
                    fontWeight: 650,
                    color: "text.primary",
                    textDecoration: "none",
                    "&:hover": { color: "primary.main" },
                  }}
                >
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                    sx={{ mr: 1 }}
                  >
                    {index + 1}
                  </Typography>
                  {candidate.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: compact ? 20 : 26,
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                  }}
                >
                  {candidate.nomination_likelihood_pct.toFixed(2)}
                  <Typography component="span" variant="caption">
                    %
                  </Typography>
                </Typography>
              </Stack>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.25 }}
              >
                {compact ? read.path : read.advantage}
              </Typography>
              {compact && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.5 }}
                >
                  Constraint: {read.vulnerability}
                </Typography>
              )}
              {!compact && (
                <Typography variant="body2" sx={{ mt: 0.75 }}>
                  <Box component="span" sx={{ fontWeight: 600 }}>
                    Main obstacle:{" "}
                  </Box>
                  {read.vulnerability}
                </Typography>
              )}
              <Stack
                direction="row"
                sx={{
                  mt: 0.25,
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Button
                  size="small"
                  onClick={() =>
                    evidence({
                      title: `${candidate.name}: nomination assessment`,
                      summary: candidate.forecast_rationale,
                      event_ids: read.event_ids,
                      showIssuePlayers: false,
                      source_ids: read.source_ids,
                    })
                  }
                >
                  View basis
                </Button>
                <Button
                  size="small"
                  component={RouterLink}
                  to={`/nominees/${candidate.id}`}
                >
                  Full profile
                </Button>
                <Typography variant="caption" color="text.secondary">
                  {delta === 0
                    ? "Estimate held"
                    : delta === undefined
                      ? "Imported estimate"
                      : `${delta > 0 ? "+" : ""}${delta.toFixed(2)} pp`}
                </Typography>
              </Stack>
            </Box>
          );
        })}
      <Typography variant="caption" color="text.secondary">
        Subjective estimates, conditional on one of these five winning.
        Full-field odds and measured polling support are separate.
      </Typography>
    </Stack>
  );
}
