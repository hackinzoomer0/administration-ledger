import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { data } from "../lib/data";
import { latestWargame, substantiveSnapshots } from "../lib/selectors";
import { ReadingBlock } from "./ReadingBlock";

export function CandidateWargameBasis({
  candidateId,
}: {
  candidateId: string;
}) {
  const candidate = data.nomination.candidates.find(
    (row) => row.id === candidateId,
  );
  const full = latestWargame(data.nomination.tracking.history);
  if (!candidate || !full) return null;
  const { game, reviewedAt, snapshotId } = full;
  const debate = game.candidate_debates[candidateId];
  const alternative =
    game.comparison_review?.candidates[candidateId]?.numerical_alternative;
  const alternativeScenario = game.scenarios.find(
    (row) => row.id === alternative?.scenario_id,
  );
  const assessment = data.assessment.nomination.candidates.find(
    (row) => row.candidate_id === candidateId,
  );
  const snapshot = data.nomination.tracking.history.find(
    (row) => row.id === snapshotId,
  )!;
  const delta = snapshot.assessments[candidateId]?.delta_pp;
  const latest = substantiveSnapshots(data.nomination.tracking.history).at(-1);
  const scenarios = [...game.scenarios]
    .filter((row) => row.weight_pct > 0)
    .sort(
      (a, b) =>
        b.weight_pct - a.weight_pct ||
        b.shares_pct[candidateId] - a.shares_pct[candidateId],
    );

  return (
    <Stack spacing={2.5} sx={{ minWidth: 0 }}>
      <Box>
        <Typography variant="overline">Wargame result</Typography>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}
        >
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
          >
            {candidate.nomination_likelihood_pct.toFixed(2)}%
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={
              delta === null
                ? "Roster baseline"
                : delta === undefined
                  ? "Initial estimate"
                  : delta === 0
                    ? "Held at last full review"
                    : `${delta > 0 ? "+" : ""}${delta.toFixed(2)} pp at last full review`
            }
          />
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1 }}
        >
          Full wargame reviewed {reviewedAt}
          {latest?.type === "daily_review"
            ? ` · Daily monitoring ${latest.date}; odds carried forward`
            : ""}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 0.5 }}
        >
          Subjective nomination chance within the{" "}
          {data.nomination.candidates.length}-candidate field; not polling
          support or calibrated odds.
        </Typography>
      </Box>
      <ReadingBlock title="The winning path" text={debate.best_case} />
      <ReadingBlock
        title="The main obstacle"
        text={assessment?.vulnerability ?? debate.failure_case}
      />
      <ReadingBlock
        title="What would change the estimate"
        text={debate.durability_test}
      />
      <Accordion disableGutters elevation={0} variant="outlined">
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">
            Why this estimate{" "}
            {delta === 0
              ? "held"
              : delta === null || delta === undefined
                ? "was selected"
                : "changed"}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <ReadingBlock
              title="Starting political landscape"
              text={game.projection_review?.current_landscape.assessment}
            />
            <ReadingBlock title="The wargame judgment" text={debate.verdict} />
            <ReadingBlock
              title="The strongest challenge"
              text={debate.rebuttal}
            />
            <ReadingBlock
              title="Entry and organization"
              text={debate.entry_assessment}
            />
            {alternative && alternativeScenario && (
              <ReadingBlock
                title="An alternative judgment tested"
                text={`A different allocation in “${alternativeScenario.name}” produces ${alternative.probabilities_pct[candidateId].toFixed(2)}% overall, compared with the selected ${snapshot.probabilities_pct[candidateId].toFixed(2)}%. ${alternative.adjudication}`}
              />
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
          Scenarios behind the estimate
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Each row separates the likelihood of a political environment from this
          candidate’s chance of winning within it. Expand a path to see how
          support could form or fall apart.
        </Typography>
        <Stack spacing={1}>
          {scenarios.map((scenario) => {
            const projected = game.projection_review?.scenarios[scenario.id];
            const path = projected?.candidate_paths[candidateId];
            return (
              <Accordion
                key={scenario.id}
                disableGutters
                elevation={0}
                variant="outlined"
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2">{scenario.name}</Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 0.5 }}
                    >
                      Environment likelihood: {scenario.weight_pct}%
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Candidate’s chance here:{" "}
                      {scenario.shares_pct[candidateId]}%
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <ReadingBlock
                      title="The projected landscape"
                      text={
                        projected?.projected_landscape ?? scenario.definition
                      }
                    />
                    {path ? (
                      <>
                        <ReadingBlock
                          title="Candidate response"
                          text={path.candidate_response}
                        />
                        <ReadingBlock
                          title="Voter response"
                          text={path.voter_response}
                        />
                        <ReadingBlock
                          title="Donor and media response"
                          text={path.donor_media_response}
                        />
                        <ReadingBlock
                          title="Organization and coalition"
                          text={path.organization_coalition}
                        />
                        <ReadingBlock
                          title="How the effects reinforce or reverse"
                          text={path.feedback}
                        />
                        <ReadingBlock
                          title="Why this chance"
                          text={path.share_justification}
                        />
                        <ReadingBlock
                          title="What could break this path"
                          text={path.countercase.replace(
                            /\s*See comparison_review numerical_alternative[^.]*\.?/g,
                            "",
                          )}
                        />
                      </>
                    ) : (
                      <ReadingBlock
                        title="Why this candidate benefits or loses"
                        text={scenario.candidate_reasoning[candidateId]}
                      />
                    )}
                    <ReadingBlock
                      title="What would undermine the scenario"
                      text={scenario.falsifier}
                    />
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 1.5 }}
        >
          The estimate averages these candidate chances using the environment
          likelihoods. Responses are projections grounded in the linked record,
          not observed endorsements or voter preferences.
        </Typography>
      </Box>
    </Stack>
  );
}
