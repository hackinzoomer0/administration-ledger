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
import { label } from "../lib/selectors";
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
}: {
  game: Wargame;
  candidateId?: string;
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
    return (
      <Section
        title="The predictive case and its strongest challenge"
        description={game.debate_mode}
      >
        <ReadingBlock title="Adjudicated forecast" text={debate.verdict} />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 3,
          }}
        >
          <ReadingBlock
            title="How this candidate wins"
            text={debate.best_case}
          />
          <ReadingBlock
            title="How this path fails"
            text={debate.failure_case}
          />
        </Box>
        <ReadingBlock title="The strongest rebuttal" text={debate.rebuttal} />
        <ReadingBlock title="Likely next move" text={debate.next_move} />
        <ReadingBlock
          title="The attack a rival can make"
          text={debate.rival_attack}
        />
        <ReadingBlock
          title="Entry and organization"
          text={debate.entry_assessment}
        />
        <ReadingBlock
          title="What would change this judgment"
          text={debate.durability_test}
        />
        {basis("Candidate wargame: evidence", debate)}
      </Section>
    );
  }
  return (
    <Section
      title="Paths that drive the forecast"
      description="Scenario weights and candidate shares are subjective judgments. Their weighted mixture produces the estimates; it is not a calibrated model or a poll."
    >
      <Typography variant="body2">{game.summary}</Typography>
      <Panel title="Election verdict, blame and likely reactions">
        {Object.entries(game.judgments).map(([key, row]) => (
          <Box key={key}>
            <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
              {label(key)}
            </Typography>
            <ReadingBlock title="Judgment" text={row.finding} />
            <ReadingBlock title="Countercase" text={row.countercase} />
            <ReadingBlock title="Resolution" text={row.resolution} />
            {basis("Wargame: " + label(key), row)}
          </Box>
        ))}
      </Panel>
      <Stack spacing={1}>
        {game.scenarios.map((s) => (
          <Panel key={s.id} title={`${s.weight_pct}% weight · ${s.name}`}>
            <ReadingBlock title="Scenario" text={s.definition} />
            <ReadingBlock title="Why this weight" text={s.weight_reason} />
            <ReadingBlock
              title="Actions, responses and consequences"
              text={s.sequence}
            />
            <Typography variant="subtitle2">
              Winner shares within this scenario
            </Typography>
            <Stack spacing={1.5} divider={<Divider />}>
              {[...data.nomination.candidates]
                .sort((a, b) => s.shares_pct[b.id] - s.shares_pct[a.id])
                .map((c) => (
                  <Box key={c.id}>
                    <Typography variant="subtitle2">
                      {c.name} · {s.shares_pct[c.id]}%
                    </Typography>
                    <Typography variant="body2">
                      {s.candidate_reasoning[c.id]}
                    </Typography>
                  </Box>
                ))}
            </Stack>
            <ReadingBlock
              title="What would undermine this scenario"
              text={s.falsifier}
            />
            {basis(s.name, s)}
          </Panel>
        ))}
      </Stack>
      <Panel title="Assumptions, sensitivity and dated tests">
        <ReadingBlock
          title="How the scenarios are separated"
          text={game.partition_rule}
        />
        <ReadingBlock
          title="Limits of the numbers"
          text={game.weighting_note}
        />
        <ReadingBlock title="Unlisted-field risk" text={game.field_risk} />
        <Typography variant="subtitle2">
          Ten-point scenario-weight stress
        </Typography>
        <Typography variant="body2">
          Moving 10 percentage points of weight from any one scenario to another
          changes the estimates by up to the amounts below. This is a
          sensitivity check, not a confidence interval.
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
            </Typography>
            <ReadingBlock title="Expectation" text={p.likelihood} />
            <ReadingBlock title="Observable test" text={p.test} />
            <Typography variant="body2">{p.resolution}</Typography>
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
