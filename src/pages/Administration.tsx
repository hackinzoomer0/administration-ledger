import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";
import { data } from "../lib/data";
import { label } from "../lib/selectors";
import { AssessmentMeta } from "../components/AssessmentMeta";
import { ContextNav } from "../components/ContextNav";
import { TopicPlayers } from "../components/TopicPlayers";
import { PowerShifts } from "../components/PowerShifts";
import { PowerList } from "../components/PowerList";
import { ReadingBlock } from "../components/ReadingBlock";
import { Section } from "../components/Section";
import { EntityChips } from "../components/EntityChips";
import { useEvidence } from "../lib/evidence-context";
export default function Administration() {
  const { id } = useParams();
  const evidence = useEvidence();
  const contest = data.assessment.administration.contests.find(
    (row) => row.id === id,
  );
  if (id && !contest)
    return (
      <Stack>
        <Typography>Decision assessment not found.</Typography>
        <Button component={RouterLink} to="/administration">
          All decisions
        </Button>
      </Stack>
    );
  return (
    <Stack spacing={3}>
      <ContextNav area="administration" />
      <Box>
        <Typography variant="overline" color="primary">
          Authority · access · constraints
        </Typography>
        <Typography variant="h3" component="h1">
          {contest?.title ?? "Administration power"}
        </Typography>
        <AssessmentMeta />
      </Box>
      {contest ? (
        <>
          <Section title="What is happening and why it matters">
            <Chip
              label={label(contest.status)}
              size="small"
              sx={{ alignSelf: "start" }}
            />
            <Typography>{contest.assessment}</Typography>
            <EntityChips
              factions={contest.faction_ids}
              issues={[contest.issue_id]}
            />
            <ReadingBlock title="Who can decide" text={contest.authority} />
            <ReadingBlock
              title="Who else can shape the decision"
              text={contest.leverage}
            />
            <Button
              onClick={() =>
                evidence({
                  title: contest.title,
                  summary: contest.assessment,
                  event_ids: contest.event_ids,
                })
              }
              variant="outlined"
            >
              Inspect supporting evidence
            </Button>
          </Section>
          <Section title="What supports the assessment">
            <ReadingBlock title="Actions" text={contest.basis.actions} />
            <ReadingBlock title="Positions" text={contest.basis.positions} />
            <ReadingBlock title="Money & access" text={contest.basis.money} />
          </Section>
          <TopicPlayers issue={contest.issue_id} />
          <Section title="What remains open">
            <ReadingBlock
              title="What would change this read"
              text={contest.watch}
            />
          </Section>
        </>
      ) : (
        <>
          <PowerShifts />
          <Section title={data.assessment.administration.headline}>
            <Typography variant="body2" sx={{ maxWidth: "75ch" }}>
              {data.assessment.administration.summary}
            </Typography>
          </Section>
          <Section
            title="Decisions that could change the administration’s direction"
            description="Issue-specific findings. These are not a numerical ranking of faction power."
          >
            <PowerList />
          </Section>
          <Typography variant="caption" color="text.secondary">
            These are the decisions synthesized in the current assessment. Other
            tracked issues remain accessible with their review limitations.
          </Typography>
        </>
      )}
    </Stack>
  );
}
