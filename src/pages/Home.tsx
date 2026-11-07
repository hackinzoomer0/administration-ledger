import { useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { activeFactions, data } from "../lib/data";
import { PageHeader } from "../components/PageHeader";
import { Section } from "../components/Section";
import { DetailFields } from "../components/DetailFields";
import { EventDetails } from "../components/EventDetails";
import { RecordDialog } from "../components/RecordDialog";
import { ResearchText } from "../components/ResearchText";
import type { EventRecord } from "../lib/types";

export default function Home() {
  const [selected, setSelected] = useState<EventRecord>();
  const recent = data.events
    .filter((row) => row.kind !== "scheduled")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);
  const runs = Object.entries(data.runs)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 5);
  const latest = data.events
    .map((row) => row.added)
    .filter((date): date is string => typeof date === "string")
    .sort()
    .at(-1);
  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="Research briefing"
        title="Follow the decision. Trace the interests."
        description="A cross-issue record of who holds authority, who seeks influence, and what the evidence shows changed."
        action={
          <Chip
            label={`Updated ${latest ?? data.nomination.as_of_date}`}
            variant="outlined"
          />
        }
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 2,
        }}
      >
        {[
          [data.events.length, "Event records"],
          [data.issues.length, "Tracked issues"],
          [activeFactions.length, "Active factions"],
          [data.nomination.candidates.length, "Authorized nominees"],
        ].map(([number, caption]) => (
          <Card key={caption} variant="outlined">
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {number}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {caption}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Alert severity="info">
        The ledger separates observed actions, attributed reporting, and
        interpretation. Candidate estimates are subjective and conditional on
        the five authorized contenders.
      </Alert>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1.5fr 1fr" },
          gap: 3,
        }}
      >
        <Section
          title="Recent developments"
          description="Open a record to inspect the source, rationale and factional implications."
        >
          <Stack divider={<Divider />} spacing={2}>
            {recent.map((event) => (
              <Box key={event.id}>
                <Stack
                  direction="row"
                  sx={{ justifyContent: "space-between", gap: 2 }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {event.date} · {event.tier}
                  </Typography>
                  <Chip size="small" label={event.kind} />
                </Stack>
                <Button
                  sx={{ display: "block", textAlign: "left", px: 0 }}
                  onClick={() => setSelected(event)}
                >
                  {event.text}
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {event.actor}
                </Typography>
              </Box>
            ))}
          </Stack>
          <Button component={RouterLink} to="/ledger" variant="outlined">
            Explore the event ledger
          </Button>
        </Section>
        <Stack spacing={3}>
          <Section
            title="2028 nomination watch"
            description={`As of ${data.nomination.as_of_date}. Conditional shares among the authorized roster.`}
          >
            {[...data.nomination.candidates]
              .sort(
                (a, b) =>
                  b.nomination_likelihood_pct - a.nomination_likelihood_pct,
              )
              .map((candidate) => (
                <Stack
                  key={candidate.id}
                  direction="row"
                  sx={{ justifyContent: "space-between" }}
                >
                  <Button
                    component={RouterLink}
                    to={`/nominees/${candidate.id}`}
                    sx={{ px: 0 }}
                  >
                    {candidate.name}
                  </Button>
                  <Typography
                    sx={{ ...{ alignSelf: "center" }, fontWeight: 700 }}
                  >
                    {candidate.nomination_likelihood_pct.toFixed(2)}%
                  </Typography>
                </Stack>
              ))}
            <Button component={RouterLink} to="/nominees" variant="outlined">
              View assumptions and history
            </Button>
          </Section>
          <Section title="Decision channels">
            <ResearchText text="Formal authority, financial exposure and political access are distinct. Start with an issue to see the decision at stake and what remains unresolved." />
            <Button component={RouterLink} to="/issues">
              Browse tracked issues
            </Button>
          </Section>
        </Stack>
      </Box>
      <Section title="Open decisions">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
            gap: 2,
          }}
        >
          {data.issues.map((issue) => (
            <Card variant="outlined" key={issue.code}>
              <CardActionArea
                component={RouterLink}
                to={`/issues/${issue.code}`}
              >
                <CardContent>
                  <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
                    {issue.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {issue.decision}
                  </Typography>
                  <Typography variant="caption">{issue.heldBy}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Section>
      <Section
        title="Review journal"
        description="Coverage and limitations are preserved with each run."
      >
        {runs.map(([id, value]) => (
          <Accordion key={id} disableGutters elevation={0} variant="outlined">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">{id}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <DetailFields value={value} depth={1} />
            </AccordionDetails>
          </Accordion>
        ))}
      </Section>
      <Section title="Methodology and research limits">
        {Object.entries(data.report).map(([key, report]) => (
          <Accordion key={key} disableGutters elevation={0} variant="outlined">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <DetailFields value={report} depth={1} />
            </AccordionDetails>
          </Accordion>
        ))}
      </Section>
      <Section title="Global watch">
        <Accordion disableGutters elevation={0} variant="outlined">
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              Cross-border developments and pending outcomes
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <DetailFields value={data.meta.world} depth={1} />
          </AccordionDetails>
        </Accordion>
      </Section>
      {selected && (
        <RecordDialog
          title="Event evidence"
          onClose={() => setSelected(undefined)}
        >
          <EventDetails event={selected} />
        </RecordDialog>
      )}
    </Stack>
  );
}
