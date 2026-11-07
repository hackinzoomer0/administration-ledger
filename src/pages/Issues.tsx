import { Box, Button, Divider, Paper, Stack, Typography } from "@mui/material";
import {
  Link as RouterLink,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { data, factionNames } from "../lib/data";
import { ContextNav } from "../components/ContextNav";
import { Section } from "../components/Section";
import { TopicPlayers } from "../components/TopicPlayers";
import { FactionPosition } from "../components/FactionPosition";
import { ReadingBlock } from "../components/ReadingBlock";
import { DetailNavigation } from "../components/DetailNavigation";
import { useEvidence } from "../lib/evidence-context";
const sections: [string, string][] = [
  ["overview", "Overview"],
  ["players", "Players & interests"],
  ["factions", "Faction disputes"],
  ["timeline", "Timeline & sources"],
];
export default function Issues() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const open = useEvidence();
  const issue = data.issues.find((row) => row.code === id);
  const section = sections.some(([key]) => key === params.get("section"))
    ? params.get("section")!
    : "overview";
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
        <Typography variant="h3" component="h1">
          Decisions across the administration
        </Typography>
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
                  {data.issueAssessments[row.code].policy}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      </Stack>
    );
  const policy = data.issueAssessments[issue.code];
  const events = data.events
    .filter(
      (row) => row.issues.includes(issue.code) && row.kind !== "scheduled",
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Stack spacing={3}>
      <ContextNav area="administration" />
      <Box>
        <Button component={RouterLink} to="/issues" size="small" sx={{ px: 0 }}>
          ← All issues
        </Button>
        <Typography variant="h3" component="h1">
          {issue.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Recorded assessment through {policy.research_as_of} · original dates
          and evidence qualifications apply
        </Typography>
      </Box>
      <DetailNavigation
        label="Issue sections"
        value={section}
        onChange={(value) => setParams({ section: value })}
        items={sections}
      />
      {section === "overview" && (
        <>
          <Section title="Current policy and the contest over it">
            <ReadingBlock
              title="Policy / current approach"
              text={policy.policy}
            />
            <ReadingBlock title="The central dispute" text={policy.dispute} />
            <Button
              onClick={() => setParams({ section: "timeline" })}
              sx={{ alignSelf: "start" }}
            >
              Read the dated record
            </Button>
          </Section>
          <Section title="Who is pushing which direction">
            <Stack spacing={2} divider={<Divider />}>
              {policy.factions.map((stance) => (
                <Box
                  key={stance.faction_id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "170px 1fr" },
                    gap: { xs: 0.5, sm: 2 },
                    alignItems: "baseline",
                  }}
                >
                  <Button
                    component={RouterLink}
                    to={`/factions/${stance.faction_id}`}
                    sx={{ px: 0, justifyContent: "start" }}
                  >
                    {factionNames[stance.faction_id]}
                  </Button>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {stance.position}
                  </Typography>
                </Box>
              ))}
            </Stack>
            <Button
              onClick={() => setParams({ section: "players" })}
              sx={{ alignSelf: "start" }}
            >
              Compare the players and financial interests
            </Button>
          </Section>
        </>
      )}
      {section === "players" && (
        <>
          <TopicPlayers issue={issue.code} />
          <Button
            sx={{ alignSelf: "start" }}
            onClick={() =>
              open({
                title: `${issue.name}: assessment basis`,
                event_ids: policy.event_ids,
              })
            }
          >
            Inspect issue evidence
          </Button>
        </>
      )}
      {section === "factions" && (
        <Stack spacing={2}>
          {policy.factions.map((stance) => (
            <Section
              key={stance.faction_id}
              title={factionNames[stance.faction_id]}
            >
              <FactionPosition issue={issue.code} faction={stance.faction_id} />
            </Section>
          ))}
        </Stack>
      )}
      {section === "timeline" && (
        <Section
          title="Dated decisions and evidence"
          description="The chronology is supporting evidence, not a claim that every older position is still current."
        >
          <Stack spacing={2} divider={<Divider />}>
            {events.slice(0, 20).map((event) => (
              <Box key={event.id}>
                <Typography variant="caption" color="text.secondary">
                  {event.date} · {event.tier}
                </Typography>
                <Typography variant="subtitle2">{event.text}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {event.actor}
                </Typography>
                <Button
                  size="small"
                  onClick={() =>
                    open({ title: event.text, event_ids: [event.id] })
                  }
                >
                  Read context & sources
                </Button>
              </Box>
            ))}
          </Stack>
          <Button component={RouterLink} to={`/ledger?issue=${issue.code}`}>
            Search the complete issue timeline
          </Button>
        </Section>
      )}
    </Stack>
  );
}
