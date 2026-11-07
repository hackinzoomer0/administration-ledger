import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { activeFactions, data, issueNames } from "../lib/data";
import { legacyNet } from "../lib/selectors";
import { PageHeader } from "../components/PageHeader";
import { Section } from "../components/Section";
import { DetailFields } from "../components/DetailFields";
import { ResearchText } from "../components/ResearchText";
import { FactionGraph } from "../components/FactionGraph";

export default function Factions() {
  const { id } = useParams();
  const [tab, setTab] = useState("overview");
  const [issue, setIssue] = useState("");
  const faction = data.factions.find((row) => row.id === id);
  if (id && !faction)
    return (
      <Alert severity="warning">
        Faction not found.{" "}
        <Button component={RouterLink} to="/factions">
          All factions
        </Button>
      </Alert>
    );
  if (!faction)
    return (
      <Stack spacing={3}>
        <PageHeader
          title="Factions and relationships"
          description="Groups are analytical syntheses of dated actions. Alignment does not establish coordination, and financial exposure does not prove control."
        />
        <Section
          title="The relationship map"
          description="Select a faction to open its profile. The same profiles are available in the cards below."
        >
          <FactionGraph />
        </Section>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)",
            },
            gap: 2,
          }}
        >
          {activeFactions.map((row) => (
            <Card key={row.id} variant="outlined">
              <CardActionArea component={RouterLink} to={`/factions/${row.id}`}>
                <CardContent>
                  <Typography variant="h6">{row.name}</Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    {row.wants || row.why}
                  </Typography>
                  <Stack direction="row" sx={{ ...{ mt: 2 }, gap: 1 }}>
                    <Chip
                      size="small"
                      label={`${row.members.length} roster entries`}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${Object.keys(row.positions).length} issues`}
                    />
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
        <Section title="Relationship evidence">
          <DetailFields value={data.meta.dynamics} depth={1} />
        </Section>
        <Section title="Archived factions">
          {data.factions
            .filter((row) => row.dissolved)
            .map((row) => (
              <Box key={row.id}>
                <Button component={RouterLink} to={`/factions/${row.id}`}>
                  {row.name}
                </Button>
                <Typography variant="body2">
                  Dissolved {row.dissolved}; retained as historical context.
                </Typography>
              </Box>
            ))}
        </Section>
      </Stack>
    );
  const legal = data.meta.legal as { entries?: { factions?: string[] }[] };
  const fields: Record<string, unknown> = {
    overview: faction.overview,
    goals: {
      wants: faction.wants,
      why: faction.why,
      gained: faction.gained,
      lost: faction.lost,
      weaknesses: faction.weak,
    },
  };
  const chart = Object.keys(faction.positions).map((code) => ({
    name: issueNames[code] ?? code,
    net: legacyNet(
      data.events.filter((row) => row.issues.includes(code)),
      faction.id,
    ),
  }));
  return (
    <Stack spacing={3}>
      <Button component={RouterLink} to="/factions" sx={{ alignSelf: "start" }}>
        ← All factions
      </Button>
      <PageHeader
        title={faction.name}
        description={
          faction.wants ||
          "Dated actions, interests and channels into decisions."
        }
        action={
          <Button
            component={RouterLink}
            to={`/ledger?faction=${faction.id}`}
            variant="outlined"
          >
            View evidence
          </Button>
        }
      />
      {faction.dissolved && (
        <Alert severity="warning">
          Archived faction, dissolved {faction.dissolved}. Use current faction
          homes for present analysis.
        </Alert>
      )}
      <Tabs
        value={tab}
        onChange={(_, value: string) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="Faction profile sections"
      >
        {[
          "overview",
          "positions",
          "people",
          "money",
          "relationships",
          "legal",
          "legacy scores",
        ].map((value) => (
          <Tab key={value} value={value} label={value} />
        ))}
      </Tabs>
      {tab === "overview" && (
        <Section title="Program and interests">
          <DetailFields value={fields} />
        </Section>
      )}
      {tab === "positions" && (
        <Section title="Positions by issue">
          <TextField
            select
            size="small"
            label="Issue"
            value={issue}
            onChange={(event) => setIssue(event.target.value)}
          >
            <MenuItem value="">All issues</MenuItem>
            {Object.keys(faction.positions).map((code) => (
              <MenuItem key={code} value={code}>
                {issueNames[code]}
              </MenuItem>
            ))}
          </TextField>
          {Object.entries(faction.positions)
            .filter(([code]) => !issue || issue === code)
            .map(([code, blocks]) => (
              <Box key={code}>
                <Button component={RouterLink} to={`/issues/${code}`}>
                  {issueNames[code]}
                </Button>
                {blocks.map((block, index) => (
                  <Box key={index}>
                    <Typography variant="subtitle2">{block.title}</Typography>
                    {block.paras.map((text, i) => (
                      <Box key={i} sx={{ my: 1 }}>
                        <ResearchText text={text} />
                      </Box>
                    ))}
                  </Box>
                ))}
              </Box>
            ))}
        </Section>
      )}
      {tab === "people" && (
        <Section
          title="Personnel roster"
          description="Roster alignment is a legacy judgment, not measured influence."
        >
          {faction.members.map((row, index) => (
            <DetailFields
              key={index}
              value={{
                person: row[0],
                role: row[1],
                issue_channel: row[2],
                legacy_alignment: row[3],
                stakes: row[4],
              }}
            />
          ))}
          <Button component={RouterLink} to={`/people?faction=${faction.id}`}>
            Browse linked people
          </Button>
        </Section>
      )}
      {tab === "money" && (
        <Section
          title="Money and access"
          description="Documented relationships and potential gains do not establish an exchange for an official act."
        >
          {faction.donors.map((row, index) => (
            <DetailFields
              key={index}
              value={{
                payer: row[0],
                amount_or_relationship: row[1],
                reaches: row[2],
                issues: row[3],
                potential_gain: row[4],
              }}
            />
          ))}
          <Button component={RouterLink} to={`/donors?faction=${faction.id}`}>
            Browse linked donors
          </Button>
        </Section>
      )}
      {tab === "relationships" && (
        <Section title="Alliances and disputes">
          <DetailFields value={faction.edges} />
        </Section>
      )}
      {tab === "legal" && (
        <Section
          title="Legal exposure"
          description="Allegations and prospective scrutiny are not findings of liability."
        >
          <DetailFields
            value={
              legal.entries?.filter((row) =>
                row.factions?.includes(faction.id),
              ) ?? []
            }
          />
          <DetailFields value={faction.legal} />
        </Section>
      )}
      {tab === "legacy scores" && (
        <Section title="Legacy weighted effects">
          <Alert severity="warning">
            These inherited scores summarize editorial event weights. They are
            not a validated ranking of power, formal authority or nomination
            likelihood.
          </Alert>
          <Box sx={{ height: 340, width: "100%", minWidth: 0 }}>
            <ResponsiveContainer>
              <BarChart
                data={chart}
                layout="vertical"
                margin={{ left: 30, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar dataKey="net" fill="#215c63" name="Legacy weighted net" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Section>
      )}
    </Stack>
  );
}
