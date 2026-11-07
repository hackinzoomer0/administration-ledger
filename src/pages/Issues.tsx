import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Link as RouterLink, useParams } from "react-router-dom";
import { activeFactions, data } from "../lib/data";
import { ContextNav } from "../components/ContextNav";
import { Section } from "../components/Section";
import { PowerList } from "../components/PowerList";
import { ReadingBlock } from "../components/ReadingBlock";
export default function Issues() {
  const { id } = useParams();
  const issue = data.issues.find((row) => row.code === id);
  if (id && !issue)
    return (
      <Typography>
        Issue not found.{" "}
        <Button component={RouterLink} to="/issues">
          All issues
        </Button>
      </Typography>
    );
  if (!issue)
    return (
      <Stack spacing={3}>
        <ContextNav area="administration" />
        <Box>
          <Typography variant="overline">Issue coverage</Typography>
          <Typography variant="h3" component="h1">
            Decisions across the administration
          </Typography>
        </Box>
        <Paper variant="outlined" sx={{ p: 2.5 }}>
          <Stack spacing={2} divider={<Divider />}>
            {data.issues.map((row) => (
              <Box key={row.code}>
                <Button
                  component={RouterLink}
                  to={`/issues/${row.code}`}
                  sx={{ px: 0 }}
                >
                  {row.name}
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {row.decision}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {data.assessment.administration.contests.some(
                    (contest) => contest.issue_id === row.code,
                  )
                    ? "Included in the current assessment"
                    : "Historical coverage · current synthesis not yet reviewed"}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      </Stack>
    );
  const contests = data.assessment.administration.contests.filter(
    (row) => row.issue_id === issue.code,
  );
  return (
    <Stack spacing={3}>
      <ContextNav area="administration" />
      <Box>
        <Typography variant="overline">Decision context</Typography>
        <Typography variant="h3" component="h1">
          {issue.name}
        </Typography>
      </Box>
      <Section title="Current assessment">
        {contests.length ? (
          <PowerList contests={contests} />
        ) : (
          <Typography variant="body2">
            A current synthesis for this issue has not been established in the
            reviewed snapshot. The dated record remains available; the original
            summary below may have been superseded.
          </Typography>
        )}
        <Button component={RouterLink} to={`/ledger?issue=${issue.code}`}>
          Inspect dated episodes
        </Button>
      </Section>
      <Accordion disableGutters elevation={0} variant="outlined">
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          Original issue summary and open questions
        </AccordionSummary>
        <AccordionDetails>
          <ReadingBlock
            title="Original authority summary"
            text={issue.heldBy}
          />
          <ReadingBlock
            title="Recorded pending questions"
            text={issue.pending}
          />
        </AccordionDetails>
      </Accordion>
      <Section title="Faction positions in the recorded research">
        {activeFactions
          .filter((faction) => faction.positions[issue.code])
          .map((faction) => (
            <Accordion
              key={faction.id}
              disableGutters
              elevation={0}
              variant="outlined"
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                {faction.name}
              </AccordionSummary>
              <AccordionDetails>
                {faction.positions[issue.code].map((block, index) => (
                  <ReadingBlock
                    key={index}
                    title={block.title}
                    text={block.paras.join("\n\n")}
                  />
                ))}
                <Button component={RouterLink} to={`/factions/${faction.id}`}>
                  Faction profile
                </Button>
              </AccordionDetails>
            </Accordion>
          ))}
      </Section>
    </Stack>
  );
}
