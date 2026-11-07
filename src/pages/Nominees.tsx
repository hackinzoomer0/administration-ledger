import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Link as RouterLink, useParams } from "react-router-dom";
import { data } from "../lib/data";
import { substantiveSnapshots } from "../lib/selectors";
import { useEvidence } from "../lib/evidence-context";
import { AssessmentMeta } from "../components/AssessmentMeta";
import { CandidateList } from "../components/CandidateList";
import { ReadingBlock } from "../components/ReadingBlock";
import { ResearchText } from "../components/ResearchText";
import { Section } from "../components/Section";
import { DetailFields } from "../components/DetailFields";
export default function Nominees() {
  const { id } = useParams();
  const [tab, setTab] = useState("assessment");
  const evidence = useEvidence();
  const forecast = data.nomination;
  const history = substantiveSnapshots(forecast.tracking.history);
  const latest = history.at(-1);
  const candidate = forecast.candidates.find((row) => row.id === id);
  const read = data.assessment.nomination.candidates.find(
    (row) => row.candidate_id === id,
  );
  if (id && (!candidate || !read))
    return (
      <Typography>
        Candidate not found.{" "}
        <Button component={RouterLink} to="/nominees">
          View the tracked field
        </Button>
      </Typography>
    );
  if (candidate && read)
    return (
      <Stack spacing={3}>
        <Button
          component={RouterLink}
          to="/nominees"
          sx={{ alignSelf: "start" }}
        >
          ← The nomination field
        </Button>
        <Box>
          <Typography variant="overline">2028 Republican nomination</Typography>
          <Stack
            direction="row"
            sx={{
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 2,
            }}
          >
            <Typography component="h1" variant="h3">
              {candidate.name}
            </Typography>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: 32,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {candidate.nomination_likelihood_pct.toFixed(2)}
              <Typography component="span" variant="body2">
                %
              </Typography>
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Subjective share within the five-candidate field ·{" "}
            {latest?.assessments[id!]?.delta_pp === 0
              ? "Estimate held"
              : "See reviewed history"}
          </Typography>
          <AssessmentMeta />
        </Box>
        <Tabs
          value={tab}
          onChange={(_, value: string) => setTab(value)}
          variant="scrollable"
          aria-label="Candidate sections"
        >
          {[
            ["assessment", "Assessment"],
            ["positions", "Positions"],
            ["money", "Backers & base"],
            ["record", "Strengths & history"],
            ["evidence", "Evidence"],
          ].map(([value, label]) => (
            <Tab key={value} value={value} label={label} />
          ))}
        </Tabs>
        {tab === "assessment" && (
          <>
            <Section title="The path and the obstacle">
              <ReadingBlock title="Route to the nomination" text={read.path} />
              <ReadingBlock
                title="Organizational or coalition advantage"
                text={read.advantage}
              />
              <ReadingBlock
                title="Principal vulnerability"
                text={read.vulnerability}
              />
              <ReadingBlock
                title="Why this estimate"
                text={candidate.forecast_rationale}
              />
              <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  onClick={() =>
                    evidence({
                      title: `${candidate.name}: assessment basis`,
                      summary: read.path,
                      event_ids: read.event_ids,
                      source_ids: read.source_ids,
                    })
                  }
                >
                  Inspect the evidence
                </Button>
                {read.person_id && (
                  <Button
                    component={RouterLink}
                    to={`/people/${read.person_id}`}
                  >
                    Political profile
                  </Button>
                )}
              </Stack>
            </Section>
            <Section title="What could change the estimate">
              <ReadingBlock
                title="Upside conditions"
                text={candidate.upside_triggers.join("\n\n")}
              />
              <ReadingBlock
                title="Downside conditions"
                text={candidate.downside_triggers.join("\n\n")}
              />
              <ReadingBlock
                title="Strongest counterargument"
                text={candidate.strongest_counterargument}
              />
            </Section>
          </>
        )}
        {tab === "positions" && (
          <Section title="Actions and stated positions">
            <Typography variant="body2" color="text.secondary">
              Demonstrated behavior, current statements and projected campaign
              commitments are distinguished.
            </Typography>
            {Object.entries(candidate.positions).map(([key, position]) => (
              <Box key={key}>
                <Typography variant="subtitle1" sx={{ fontWeight: 650, mb: 1 }}>
                  {forecast.issue_definitions.find((issue) => issue.id === key)
                    ?.label ?? key}
                </Typography>
                <ResearchText text={position.summary} />
                <Typography variant="caption" color="text.secondary">
                  {position.uncertainty}
                </Typography>
                <Button
                  size="small"
                  onClick={() =>
                    evidence({
                      title: `${candidate.name}: ${forecast.issue_definitions.find((issue) => issue.id === key)?.label ?? key}`,
                      summary: position.summary,
                      event_ids: [],
                      source_ids: [
                        ...new Set(
                          position.evidence.flatMap((row) =>
                            typeof row === "object" &&
                            row !== null &&
                            !Array.isArray(row) &&
                            Array.isArray(row.source_ids)
                              ? row.source_ids.map(String)
                              : [],
                          ),
                        ),
                      ],
                    })
                  }
                >
                  Source basis
                </Button>
              </Box>
            ))}
          </Section>
        )}
        {tab === "money" && (
          <>
            <Section title="Coalition and financial relationships">
              <ReadingBlock
                title="Potential constituency"
                text={read.coalition}
              />
              <ReadingBlock title="Money and access" text={read.money} />
              <Typography variant="caption" color="text.secondary">
                Historical gifts, business investments, paid clients,
                preferences and confirmed support are separate relationships.
              </Typography>
              {(
                candidate.donors_and_financial_networks as {
                  name: string;
                  relationship: string;
                  period: string;
                  confirmed_2028_commitment: boolean;
                  source_ids: string[];
                }[]
              ).map((row, index) => (
                <Box key={index}>
                  <Typography variant="subtitle2">{row.name}</Typography>
                  <ResearchText text={row.relationship} />
                  <Typography variant="caption" color="text.secondary">
                    {row.period} ·{" "}
                    {row.confirmed_2028_commitment
                      ? "Confirmed commitment in the record"
                      : "No confirmed 2028 commitment in this record"}
                  </Typography>
                  <Button
                    size="small"
                    onClick={() =>
                      evidence({
                        title: row.name,
                        summary: row.relationship,
                        event_ids: [],
                        source_ids: row.source_ids,
                      })
                    }
                  >
                    Evidence
                  </Button>
                </Box>
              ))}
            </Section>
            {Array.isArray(candidate.lobbying_clients_not_donors) && (
              <Section
                title="Recorded paid representation"
                description="Imported reported client relationships; the amounts have not been re-audited in this assessment. These are not campaign donations."
              >
                {(
                  candidate.lobbying_clients_not_donors as {
                    name: string;
                    relationship: string;
                    reporting_window: string;
                    reported_lobbying_income_usd: number | null;
                    source_ids: string[];
                  }[]
                ).map((client) => (
                  <Box key={client.name}>
                    <Typography variant="subtitle2">{client.name}</Typography>
                    <ResearchText text={client.relationship} />
                    <Typography variant="body2">
                      {client.reporting_window}
                      {client.reported_lobbying_income_usd == null
                        ? " · income not established"
                        : ` · reported income $${client.reported_lobbying_income_usd.toLocaleString()}`}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() =>
                        evidence({
                          title: client.name,
                          summary: client.relationship,
                          event_ids: [],
                          source_ids: client.source_ids,
                        })
                      }
                    >
                      Source basis
                    </Button>
                  </Box>
                ))}
              </Section>
            )}
            <Section title="Documented record and potential exposure">
              <Typography variant="caption" color="text.secondary">
                Reported allegations and prospective scrutiny are not findings
                of liability.
              </Typography>
              <DetailFields
                value={candidate.controversies_and_potential_exposure}
                depth={1}
              />
            </Section>
          </>
        )}
        {tab === "record" && (
          <>
            <Section title="Strengths and weaknesses">
              <ReadingBlock
                title="Strengths"
                text={candidate.strengths_for_base.join("\n\n")}
              />
              <ReadingBlock
                title="Weaknesses"
                text={candidate.weaknesses_for_base.join("\n\n")}
              />
            </Section>
            <Section title="Expected base and coalition limits">
              <DetailFields value={candidate.base_of_support} depth={1} />
            </Section>
            <Section title="Political and policy history">
              <DetailFields value={candidate.consistency_timeline} depth={1} />
            </Section>
          </>
        )}
        {tab === "evidence" && (
          <Section title="Research basis">
            <ReadingBlock
              title="Latest substantive assessment"
              text={latest?.assessments[candidate.id]?.reason}
            />
            <Typography variant="caption">
              {latest?.date} ·{" "}
              {latest?.assessments[candidate.id]?.review_status === "partial"
                ? "Some evidence remains unverified"
                : "See review scope"}
            </Typography>
            <Button
              variant="outlined"
              onClick={() =>
                evidence({
                  title: `${candidate.name}: linked evidence`,
                  event_ids: read.event_ids,
                  source_ids: read.source_ids,
                })
              }
            >
              Open linked episodes and sources
            </Button>
            <ReadingBlock
              title="Coverage limits"
              text={latest?.gaps.join("\n\n")}
            />
            <Accordion disableGutters elevation={0} variant="outlined">
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                Complete candidate record and historical research
              </AccordionSummary>
              <AccordionDetails>
                <DetailFields value={candidate} depth={1} />
              </AccordionDetails>
            </Accordion>
          </Section>
        )}
      </Stack>
    );
  const dates = new Set(history.map((row) => row.date));
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary">
          2028 Republican nomination
        </Typography>
        <Typography variant="h3" component="h1">
          The nomination assessment
        </Typography>
        <AssessmentMeta />
      </Box>
      <Section title={data.assessment.nomination.headline}>
        <Typography variant="body2" sx={{ maxWidth: "75ch" }}>
          {data.assessment.nomination.summary}
        </Typography>
      </Section>
      <Section title="The field: paths and vulnerabilities">
        <CandidateList />
      </Section>
      <Section title="What is still uncertain">
        <Stack spacing={1.5} divider={<Divider />}>
          {forecast.forecast_methodology.critical_uncertainties.map((text) => (
            <Typography key={text} variant="body2">
              {text}
            </Typography>
          ))}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          No post-election support gain is inferred from a positioning move
          alone. The exact weights remain provisional.
        </Typography>
      </Section>
      <Accordion disableGutters elevation={0} variant="outlined">
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">
            Reviewed changes and forecast method
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Typography variant="body2">
              {dates.size < 2
                ? "The record does not yet contain a meaningful series of substantive review dates. Technical snapshots are excluded from the political history."
                : "Substantive review history; changes are percentage points within the tracked field."}
            </Typography>
            {history.map((row) => (
              <Box key={row.id}>
                <Typography variant="subtitle2">{row.date}</Typography>
                <ResearchText text={row.summary} />
              </Box>
            ))}
            <ReadingBlock
              title="Forecast target"
              text={forecast.forecast_methodology.target}
            />
            <Button component={RouterLink} to="/research?section=methods">
              Full methods &amp; limitations
            </Button>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
