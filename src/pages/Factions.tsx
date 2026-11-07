import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Link as RouterLink, useParams } from "react-router-dom";
import { activeFactions, data, factionNames, issueNames } from "../lib/data";
import { useEvidence } from "../lib/evidence-context";
import { ContextNav } from "../components/ContextNav";
import { Section } from "../components/Section";
import { PowerList } from "../components/PowerList";
import { DetailFields } from "../components/DetailFields";
import { FactionPosition } from "../components/FactionPosition";
import { FactionGraph } from "../components/FactionGraph";
export default function Factions() {
  const { id } = useParams();
  const [tab, setTab] = useState("assessment");
  const [issue, setIssue] = useState("");
  const evidence = useEvidence();
  const faction = data.factions.find((row) => row.id === id);
  if (id && !faction)
    return (
      <Typography>
        Faction not found.{" "}
        <Button component={RouterLink} to="/factions">
          All factions
        </Button>
      </Typography>
    );
  if (faction)
    return (
      <Stack spacing={3}>
        <ContextNav area="administration" />
        <Box>
          <Typography variant="overline">
            Faction profile{faction.dissolved ? " · archived" : ""}
          </Typography>
          <Typography variant="h3" component="h1">
            {faction.name}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, maxWidth: "72ch" }}
          >
            {faction.wants}
          </Typography>
        </Box>
        <Tabs
          value={tab}
          onChange={(_, value: string) => setTab(value)}
          variant="scrollable"
          aria-label="Faction sections"
        >
          {[
            ["assessment", "Current context"],
            ["positions", "Positions & record"],
            ["money", "People & money"],
            ["history", "Historical report"],
          ].map(([value, label]) => (
            <Tab key={value} value={value} label={label} />
          ))}
        </Tabs>
        {tab === "assessment" && (
          <Section
            title="Where the faction has a channel"
            description="Issue-specific access and leverage; inclusion is not an overall ranking of power."
          >
            {data.assessment.administration.contests.some((row) =>
              row.faction_ids.includes(faction.id),
            ) ? (
              <PowerList
                contests={data.assessment.administration.contests.filter(
                  (row) => row.faction_ids.includes(faction.id),
                )}
              />
            ) : (
              <Typography variant="body2">
                This faction has no newly synthesized decision assessment in the
                reviewed snapshot. Its historical positions remain available
                below.
              </Typography>
            )}
          </Section>
        )}
        {tab === "positions" && (
          <Section
            title="Dated positions and actions"
            description="Original report context; check newer episodes before treating an older statement as the current position."
          >
            {Object.entries(faction.positions).map(([code]) => (
              <Accordion
                key={code}
                disableGutters
                elevation={0}
                variant="outlined"
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  {issueNames[code] ?? code}
                </AccordionSummary>
                <AccordionDetails>
                  <FactionPosition issue={code} faction={faction.id} />
                </AccordionDetails>
              </Accordion>
            ))}
          </Section>
        )}
        {tab === "money" && (
          <>
            <Section title="People with a recorded role">
              {data.people
                .filter((row) => row.home === faction.id)
                .slice(0, 8)
                .map((person) => (
                  <Box key={person.id}>
                    <Button component={RouterLink} to={`/people/${person.id}`}>
                      {person.name}
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      {person.role}
                    </Typography>
                  </Box>
                ))}
              <Button
                component={RouterLink}
                to={`/people?faction=${faction.id}`}
              >
                Full personnel directory
              </Button>
            </Section>
            <Section
              title="Financial and organizational relationships"
              description="These links do not prove control or a payment for an official act."
            >
              {data.donors
                .filter((row) => row.factions.includes(faction.id))
                .slice(0, 8)
                .map((donor) => (
                  <Box key={donor.id}>
                    <Button component={RouterLink} to={`/donors/${donor.id}`}>
                      {donor.name}
                    </Button>
                    <Typography variant="body2">{donor.identity}</Typography>
                  </Box>
                ))}
              <Button
                component={RouterLink}
                to={`/donors?faction=${faction.id}`}
              >
                All linked payers and relationships
              </Button>
            </Section>
          </>
        )}
        {tab === "history" && (
          <Section
            title="Original report and legacy judgments"
            description="This record preserves the historical research. Legacy scores and original motive judgments are not a validated current ranking."
          >
            <Accordion disableGutters elevation={0} variant="outlined">
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                Inspect the historical faction record
              </AccordionSummary>
              <AccordionDetails>
                <DetailFields value={faction} depth={1} />
              </AccordionDetails>
            </Accordion>
          </Section>
        )}
      </Stack>
    );
  const relations = data.assessment.relationships.filter(
    (row) => !issue || row.issues.includes(issue),
  );
  return (
    <Stack spacing={3}>
      <ContextNav area="administration" />
      <Box>
        <Typography variant="overline" color="primary">
          Objectives · decision channels · constraints
        </Typography>
        <Typography variant="h3" component="h1">
          Factions and their leverage
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: "70ch" }}>
          Start with what each group seeks and the decisions it can affect.
          Shared interests do not establish coordination.
        </Typography>
      </Box>
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Stack spacing={2} divider={<Divider />}>
          {activeFactions.map((row) => (
            <Box key={row.id}>
              <Button
                component={RouterLink}
                to={`/factions/${row.id}`}
                sx={{ px: 0 }}
              >
                {row.name}
              </Button>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ maxWidth: "80ch" }}
              >
                {row.wants}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Paper>
      <Section
        title="Relationships in the current assessment"
        description="Explicitly linked to episodes; these relationships are scoped to the selected issues."
      >
        <TextField
          select
          size="small"
          label="Focus issue"
          value={issue}
          onChange={(event) => setIssue(event.target.value)}
        >
          <MenuItem value="">All reviewed issues</MenuItem>
          {data.issues
            .filter((row) =>
              data.assessment.relationships.some((link) =>
                link.issues.includes(row.code),
              ),
            )
            .map((row) => (
              <MenuItem key={row.code} value={row.code}>
                {row.name}
              </MenuItem>
            ))}
        </TextField>
        {relations.map((row) => (
          <Box key={row.id}>
            <Typography variant="subtitle2">
              {factionNames[row.source]} ↔ {factionNames[row.target]}
            </Typography>
            <Typography variant="caption" color="secondary">
              {row.kind}
            </Typography>
            <Typography variant="body2" sx={{ maxWidth: "72ch" }}>
              {row.assessment}
            </Typography>
            <Button
              size="small"
              onClick={() =>
                evidence({
                  title: row.kind,
                  summary: row.assessment,
                  event_ids: row.event_ids,
                })
              }
            >
              View basis
            </Button>
          </Box>
        ))}
        <Accordion disableGutters elevation={0} variant="outlined">
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            Explore the relationship diagram
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="caption" color="text.secondary">
              Equal node sizes and placement carry no rank or authority meaning.
              Use the list above for the evidence.
            </Typography>
            <FactionGraph issue={issue} />
          </AccordionDetails>
        </Accordion>
      </Section>
      <Section title="Archived groups">
        {data.factions
          .filter((row) => row.dissolved)
          .map((row) => (
            <Button
              key={row.id}
              component={RouterLink}
              to={`/factions/${row.id}`}
            >
              {row.name} · dissolved {row.dissolved}
            </Button>
          ))}
      </Section>
    </Stack>
  );
}
