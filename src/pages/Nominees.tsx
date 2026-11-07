import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useParams } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { data } from "../lib/data";
import { PageHeader } from "../components/PageHeader";
import { Section } from "../components/Section";
import { DetailFields } from "../components/DetailFields";
import { ResearchText } from "../components/ResearchText";
const colors = ["#215c63", "#b86535", "#617b9c", "#7c6490", "#6c8250"];
export default function Nominees() {
  const { id } = useParams();
  const [tab, setTab] = useState("assessment");
  const forecast = data.nomination;
  const history = forecast.tracking.history;
  const latest = history.at(-1)!;
  const candidate = forecast.candidates.find((row) => row.id === id);
  if (id && !candidate)
    return (
      <Alert severity="warning">
        Candidate not found. The authorized roster contains five candidates.{" "}
        <Button component={RouterLink} to="/nominees">
          View roster
        </Button>
      </Alert>
    );
  if (candidate) {
    const assessment = latest.assessments[candidate.id];
    const other = Object.fromEntries(
      Object.entries(candidate).filter(
        ([key]) =>
          ![
            "id",
            "name",
            "nomination_likelihood_pct",
            "forecast_rationale",
            "positions",
          ].includes(key),
      ),
    );
    return (
      <Stack spacing={3}>
        <Button
          component={RouterLink}
          to="/nominees"
          sx={{ alignSelf: "start" }}
        >
          ← All nominees
        </Button>
        <PageHeader
          title={candidate.name}
          description="Subjective nomination assessment, linked to the same evidence as the faction report."
          action={
            <Chip
              label={`${candidate.nomination_likelihood_pct.toFixed(2)}% · conditional`}
              color="primary"
              variant="outlined"
            />
          }
        />
        <Alert severity="info">
          This is a share conditional on one of the five authorized candidates
          winning. It is not a full-field probability or a declared-candidacy
          claim.
        </Alert>
        <Tabs
          value={tab}
          onChange={(_, value: string) => setTab(value)}
          variant="scrollable"
          aria-label="Candidate profile sections"
        >
          {[
            "assessment",
            "positions",
            "networks and record",
            "daily evidence",
          ].map((value) => (
            <Tab key={value} value={value} label={value} />
          ))}
        </Tabs>
        {tab === "assessment" && (
          <>
            <Section title="Why this estimate">
              <ResearchText text={candidate.forecast_rationale} />
              <Chip
                label={`Latest change: ${assessment.delta_pp > 0 ? "+" : ""}${assessment.delta_pp.toFixed(2)} percentage points`}
                size="small"
                variant="outlined"
              />
              <ResearchText text={assessment.reason} />
            </Section>
            <Section title="What would change the assessment">
              <DetailFields
                value={{
                  upside_triggers: candidate.upside_triggers,
                  downside_triggers: candidate.downside_triggers,
                  strongest_counterargument:
                    candidate.strongest_counterargument,
                }}
              />
            </Section>
          </>
        )}
        {tab === "positions" && (
          <Section title="Policy record and uncertainty">
            {Object.entries(candidate.positions).map(([key, position]) => (
              <Box key={key}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {forecast.issue_definitions.find((issue) => issue.id === key)
                    ?.label ?? key}
                </Typography>
                <DetailFields value={position} />
              </Box>
            ))}
          </Section>
        )}
        {tab === "networks and record" && (
          <Section title="Support, relationships and record">
            <DetailFields value={other} />
          </Section>
        )}
        {tab === "daily evidence" && (
          <Section
            title="Faction links and review evidence"
            description={`Latest snapshot: ${latest.date}. Coverage is ${assessment.review_status}.`}
          >
            <DetailFields value={assessment} />
          </Section>
        )}
      </Stack>
    );
  }
  const chart = history.map((snapshot, index) => ({
    snapshot: `${snapshot.date} · ${index + 1}`,
    ...snapshot.probabilities_pct,
  }));
  return (
    <Stack spacing={3}>
      <PageHeader
        eyebrow="2028 Republican nomination"
        title="The succession watch"
        description="Five authorized contenders. A daily assessment of entry prospects, coalition support, political positioning and paths to the nomination."
        action={
          <Chip label={`As of ${forecast.as_of_date}`} variant="outlined" />
        }
      />
      <Alert severity="warning">
        These are subjective, uncalibrated estimates conditional on one of these
        five winning—not full-field odds, polling shares or market prices. No
        nominees can be added without authorization.
      </Alert>
      <Paper variant="outlined">
        <TableContainer>
          <Table
            aria-label="Nomination estimates"
            sx={{ minWidth: { xs: 0, sm: 620 } }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Candidate</TableCell>
                <TableCell>Likelihood</TableCell>
                <TableCell>Change</TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  Coverage
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...forecast.candidates]
                .sort(
                  (a, b) =>
                    b.nomination_likelihood_pct - a.nomination_likelihood_pct,
                )
                .map((candidate) => {
                  const assessment = latest.assessments[candidate.id];
                  return (
                    <TableRow key={candidate.id}>
                      <TableCell>
                        <Button
                          component={RouterLink}
                          to={`/nominees/${candidate.id}`}
                          sx={{ px: 0 }}
                        >
                          {candidate.name}
                        </Button>
                      </TableCell>
                      <TableCell sx={{ minWidth: { xs: 100, sm: 230 } }}>
                        <Stack
                          direction="row"
                          sx={{ alignItems: "center", gap: 2 }}
                        >
                          <LinearProgress
                            variant="determinate"
                            value={candidate.nomination_likelihood_pct}
                            sx={{
                              flex: 1,
                              height: 6,
                              borderRadius: 1,
                              display: { xs: "none", sm: "block" },
                            }}
                            aria-label={`${candidate.name} conditional likelihood`}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {candidate.nomination_likelihood_pct.toFixed(2)}%
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {assessment.delta_pp > 0 ? "+" : ""}
                        {assessment.delta_pp.toFixed(2)} pp
                      </TableCell>
                      <TableCell
                        sx={{ display: { xs: "none", sm: "table-cell" } }}
                      >
                        <Chip
                          size="small"
                          variant="outlined"
                          label={assessment.review_status}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Section title="Latest assessment">
        <ResearchText text={latest.summary} />
        <DetailFields value={{ coverage_gaps: latest.gaps }} />
      </Section>
      <Section
        title="Forecast history"
        description="Snapshots include holds. A recorded review does not imply that a new poll or campaign event occurred."
      >
        <Box sx={{ height: 320, minWidth: 0 }}>
          <ResponsiveContainer>
            <LineChart data={chart} margin={{ right: 20, left: -15 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="snapshot" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip />
              <Legend />
              {forecast.candidates.map((candidate, index) => (
                <Line
                  key={candidate.id}
                  type="linear"
                  dataKey={candidate.id}
                  name={candidate.name}
                  stroke={colors[index]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Section>
      <Section title="Methodology and scenarios">
        <DetailFields value={forecast.forecast_methodology} />
        <DetailFields
          value={{
            scenario_sensitivities: forecast.scenario_sensitivities,
            faction_consistency_review: forecast.faction_consistency_review,
          }}
        />
      </Section>
      <Section title="Sources and provenance">
        <DetailFields
          value={{
            sources: forecast.sources,
            import_provenance: forecast.tracking,
          }}
          depth={1}
        />
      </Section>
    </Stack>
  );
}
