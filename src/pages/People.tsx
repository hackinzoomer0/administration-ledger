import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Link as RouterLink } from "react-router-dom";
import { data, factionNames, issueNames } from "../lib/data";
import type { Person } from "../lib/types";
import { Directory } from "../components/Directory";
import { DetailFields } from "../components/DetailFields";
import { EntityChips } from "../components/EntityChips";
import { ReadingBlock } from "../components/ReadingBlock";
import { Section } from "../components/Section";
import { ContextNav } from "../components/ContextNav";
function Profile({ person }: { person: Person }) {
  const [tab, setTab] = useState("assessment");
  const candidate = data.assessment.nomination.candidates.find(
    (row) => row.person_id === person.id,
  );
  const donors = data.donors.filter(
    (row) =>
      row.people.includes(person.id) ||
      ((person.donors as string[] | undefined) ?? []).includes(row.id),
  );
  return (
    <Stack spacing={3}>
      <EntityChips
        factions={[
          ...(person.home ? [person.home] : []),
          ...(person.also ?? []),
        ]}
      />
      <Tabs
        value={tab}
        onChange={(_, value: string) => setTab(value)}
        variant="scrollable"
        aria-label="Person sections"
      >
        {[
          ["assessment", "Assessment"],
          ["positions", "Actions & positions"],
          ["money", "Money & connections"],
          ["evidence", "Full record"],
        ].map(([value, label]) => (
          <Tab key={value} value={value} label={label} />
        ))}
      </Tabs>
      {tab === "assessment" && (
        <>
          <Section title="Why this person matters">
            <ReadingBlock
              title="Role and political significance"
              text={person.read || person.role}
            />
            <ReadingBlock
              title="Assessment of incentives"
              text={person.drive}
            />
            <Typography variant="caption" color="text.secondary">
              Incentives are analyst interpretations. The underlying facts and
              motive judgments have separate evidence limits.
            </Typography>
            <ReadingBlock
              title="What would change this read"
              text={person.flip}
            />
            {candidate && (
              <Button
                component={RouterLink}
                to={`/nominees/${candidate.candidate_id}`}
                variant="outlined"
              >
                View the 2028 assessment
              </Button>
            )}
          </Section>
          <Section title="Decision and faction context">
            {data.assessment.administration.contests
              .filter((row) => row.faction_ids.includes(person.home ?? ""))
              .map((row) => (
                <Box key={row.id}>
                  <Button
                    component={RouterLink}
                    to={`/administration/${row.id}`}
                  >
                    {row.title}
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    Relevant faction context; individual causal influence
                    requires its own evidence.
                  </Typography>
                </Box>
              ))}
          </Section>
        </>
      )}
      {tab === "positions" && (
        <Section title="Actions and positions">
          <ReadingBlock
            title="Recorded pattern"
            text={person.pattern?.join("\n\n")}
          />
          {Object.entries(person.positions ?? {}).map(([code, position]) => (
            <ReadingBlock
              key={code}
              title={`${issueNames[code] ?? code} · ${position.label}`}
              text={position.view}
            />
          ))}
        </Section>
      )}
      {tab === "money" && (
        <Section
          title="Money and relationships"
          description="A documented relationship does not by itself establish influence over a decision."
        >
          {donors.length ? (
            donors.map((donor) => (
              <Box key={donor.id}>
                <Button component={RouterLink} to={`/donors/${donor.id}`}>
                  {donor.name}
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {donor.identity}
                </Typography>
                <Typography variant="body2">
                  {[...new Set(donor.amounts)].slice(0, 2).join(" · ")}
                </Typography>
              </Box>
            ))
          ) : (
            <Typography variant="body2">
              No resolved financial relationship is recorded for this person.
            </Typography>
          )}
          <ReadingBlock
            title="Other affiliations"
            text={(person.also ?? [])
              .map((id) => factionNames[id] ?? id)
              .join(", ")}
          />
        </Section>
      )}
      {tab === "evidence" && (
        <Section
          title="Full research record"
          description="Historical notes and original evidence qualifications. Older statements may have been superseded by later episodes."
        >
          <Accordion disableGutters elevation={0} variant="outlined">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              Inspect the complete person record
            </AccordionSummary>
            <AccordionDetails>
              <DetailFields value={person} depth={1} />
            </AccordionDetails>
          </Accordion>
        </Section>
      )}
    </Stack>
  );
}
export default function People() {
  return (
    <>
      <ContextNav area="research" />
      <Directory
        title="People"
        description="Who makes decisions, what they want and how they can influence policy. Open a profile for their record and supporting evidence."
        path="people"
        rows={data.people}
        subtitle={(row) => row.role}
        factions={(row) => [
          ...(row.home ? [row.home] : []),
          ...(row.also ?? []),
          ...(row.rosters ?? []).map((item) => item.f),
        ]}
        badges={(row) => <EntityChips factions={row.home ? [row.home] : []} />}
        details={(row) => <Profile key={row.id} person={row} />}
      />
    </>
  );
}
