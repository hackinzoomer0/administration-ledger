import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { data } from "../lib/data";
import type { Wargame } from "../lib/types";
import { useEvidence } from "../lib/evidence-context";
import { ReadingBlock } from "./ReadingBlock";
import { Section } from "./Section";
import { label, scenarioCopy } from "../lib/selectors";
function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Accordion disableGutters elevation={0} variant="outlined">
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>{children}</Stack>
      </AccordionDetails>
    </Accordion>
  );
}
export function ForecastWargame({
  game,
  candidateId,
  reviewedAt,
  snapshotId,
}: {
  game: Wargame;
  candidateId?: string;
  reviewedAt: string;
  snapshotId: string;
}) {
  const open = useEvidence();
  const basis = (
    title: string,
    row: { event_ids: string[]; source_ids?: string[] },
  ) => (
    <Button
      sx={{ alignSelf: "start" }}
      onClick={() => open({ title, ...row, showIssuePlayers: false })}
    >
      Inspect supporting evidence
    </Button>
  );
  if (candidateId) {
    const debate = game.candidate_debates[candidateId];
    const candidate = data.nomination.candidates.find(
      (row) => row.id === candidateId,
    )!;
    const assessment = data.assessment.nomination.candidates.find(
      (row) => row.candidate_id === candidateId,
    )!;
    return (
      <Section
        title="How this candidate could win or lose"
        description={`Full wargame reviewed ${reviewedAt}. These paths describe projected political outcomes.`}
      >
        <ReadingBlock
          title="What supports the estimate"
          text={assessment.path}
        />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 3,
          }}
        >
          <ReadingBlock
            title="How this candidate could win"
            text={debate.best_case}
          />
          <ReadingBlock
            title="What could stop them"
            text={debate.failure_case}
          />
        </Box>
        <ReadingBlock
          title="What could upset this assessment"
          text={candidate.strongest_counterargument}
        />
        <ReadingBlock
          title="What the candidate is likely to do next"
          text={debate.next_move}
        />
        <ReadingBlock
          title="How rivals could attack them"
          text={debate.rival_attack}
        />
        <ReadingBlock
          title="Running and building a campaign"
          text={debate.entry_assessment}
        />
        <ReadingBlock
          title="What could change these odds"
          text={debate.durability_test}
        />
        {basis("Candidate wargame: evidence", debate)}
      </Section>
    );
  }
  return (
    <Section
      title="How events could change the nomination"
      description="We combine the chance of each scenario with each candidate’s chance of winning in it. These are analyst estimates, not polling results."
    >
      <Typography variant="caption" color="text.secondary">
        Full wargame reviewed {reviewedAt} · weekly forecast, with daily outcome
        monitoring
      </Typography>
      <Panel title="What voters rejected, who they blame, and what comes next">
        {Object.entries(game.judgments).map(([key, row]) => (
          <Box key={key}>
            <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
              {label(key)}
            </Typography>
            <ReadingBlock title="Judgment" text={row.finding} />
            <ReadingBlock title="Countercase" text={row.countercase} />
            {basis("Wargame: " + label(key), row)}
          </Box>
        ))}
      </Panel>
      <Stack spacing={1}>
        {game.scenarios.map((s) => {
          const copy = scenarioCopy(
            s,
            snapshotId,
            data.assessment.nomination.scenario_labels,
          );
          return (
            <Panel key={s.id} title={`${s.weight_pct}% chance · ${copy.title}`}>
              <ReadingBlock title="What happens" text={copy.summary} />
              <ReadingBlock
                title="Why we think this scenario is this likely"
                text={s.weight_reason}
              />
              <Typography variant="subtitle2">
                Each candidate’s chance of winning in this scenario
              </Typography>
              <Stack spacing={1.5} divider={<Divider />}>
                {[...data.nomination.candidates]
                  .sort((a, b) => s.shares_pct[b.id] - s.shares_pct[a.id])
                  .map((c) => (
                    <Box key={c.id}>
                      <Typography variant="subtitle2">
                        {c.name} · {s.shares_pct[c.id]}%
                      </Typography>
                      <ReadingBlock
                        title="How voters could react"
                        text={
                          game.projection_review?.scenarios[s.id]
                            ?.candidate_paths[c.id]?.voter_response
                        }
                      />
                      <ReadingBlock
                        title="How support could become a campaign"
                        text={
                          game.projection_review?.scenarios[s.id]
                            ?.candidate_paths[c.id]?.organization_coalition
                        }
                      />
                    </Box>
                  ))}
              </Stack>
              <ReadingBlock
                title="What would show this scenario is wrong"
                text={s.falsifier}
              />
              {basis(copy.title, s)}
            </Panel>
          );
        })}
      </Stack>
      <Panel title="How the forecast is calculated">
        <ReadingBlock
          title="Candidates we don’t track"
          text={game.field_risk}
        />
        <Typography variant="subtitle2">
          What if one scenario became more likely?
        </Typography>
        <Typography variant="body2">
          Making one scenario 10 percentage points more likely and another 10
          points less likely changes the candidate estimates by up to the
          amounts below. This tests our assumptions; it is not a statistical
          confidence interval.
        </Typography>
        {data.nomination.candidates.map((c) => {
          const shifts = game.scenarios
            .filter((s) => s.weight_pct >= 10)
            .flatMap((donor) =>
              game.scenarios
                .filter((recipient) => recipient.id !== donor.id)
                .map(
                  (recipient) =>
                    (recipient.shares_pct[c.id] - donor.shares_pct[c.id]) / 10,
                ),
            );
          const low = Math.min(0, ...shifts);
          const high = Math.max(0, ...shifts);
          return (
            <Typography key={c.id} variant="body2">
              {c.name}: {low.toFixed(1)} to +{high.toFixed(1)} percentage points
            </Typography>
          );
        })}
        {game.predictions.map((p) => (
          <Box key={p.id}>
            <Typography variant="subtitle2">{p.claim}</Typography>
            <Typography variant="caption" color="text.secondary">
              Resolve by {p.resolve_by} · {label(p.status)}
              {p.active === false ? " · Retired" : ""}
            </Typography>
            <ReadingBlock title="Expectation" text={p.likelihood} />
            <ReadingBlock title="Observable test" text={p.test} />
            <Typography variant="body2">{p.resolution}</Typography>
            {p.retirement_reason && (
              <Typography variant="body2">
                Retirement reason: {p.retirement_reason}
              </Typography>
            )}
            {basis("Dated forecast test", p)}
          </Box>
        ))}
        <Typography variant="caption" color="text.secondary">
          {game.debate_mode}
        </Typography>
      </Panel>
    </Section>
  );
}
