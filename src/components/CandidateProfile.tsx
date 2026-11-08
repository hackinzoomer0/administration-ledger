import {
  Box,
  Button,
  Divider,
  List,
  ListItem,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { data } from "../lib/data";
import type { Candidate, CandidateAssessment } from "../lib/types";
import { substantiveSnapshots, latestWargame, label } from "../lib/selectors";
import { useEvidence } from "../lib/evidence-context";
import { ForecastWargame } from "./ForecastWargame";
import { DetailNavigation } from "./DetailNavigation";
import { ReadingBlock } from "./ReadingBlock";
import { Section } from "./Section";
import { ResearchText } from "./ResearchText";
const sections: [string, string][] = [
  ["assessment", "Summary"],
  ["wargame", "Wargame"],
  ["positions", "Positions"],
  ["strengths", "Strengths & weaknesses"],
  ["base", "Base & backers"],
  ["history", "History"],
  ["evidence", "Sources & limits"],
];
interface Base {
  classification: string;
  likely_constituencies: string[];
  constraints: string[];
  documented_organizational_relationships: {
    text: string;
    source_ids: string[];
  }[];
}
interface Backer {
  name: string;
  relationship: string;
  period: string;
  confirmed_2028_commitment: boolean;
  source_ids: string[];
}
interface History {
  period: string;
  event: string;
  source_ids: string[];
}
interface Exposure {
  title: string;
  status: string;
  details: string;
  political_implication: string;
  source_ids: string[];
}
function Points({ items }: { items: string[] }) {
  return (
    <List disablePadding>
      {items.map((item) => (
        <ListItem
          key={item}
          sx={{
            display: "list-item",
            listStyleType: "disc",
            ml: 2,
            pl: 0,
            py: 0.75,
            width: "auto",
          }}
        >
          <Typography variant="body2">{item}</Typography>
        </ListItem>
      ))}
    </List>
  );
}
export function CandidateProfile({
  candidate,
  read,
}: {
  candidate: Candidate;
  read: CandidateAssessment;
}) {
  const [params, setParams] = useSearchParams();
  const open = useEvidence();
  const requested = params.get("section");
  const section = sections.some(([key]) => key === requested)
    ? requested!
    : "assessment";
  const latest = substantiveSnapshots(data.nomination.tracking.history).at(-1);
  const fullReview = latestWargame(data.nomination.tracking.history);
  const base = candidate.base_of_support as Base;
  const backers = candidate.donors_and_financial_networks as Backer[];
  const history = candidate.consistency_timeline as History[];
  const exposures =
    candidate.controversies_and_potential_exposure as Exposure[];
  const sourceButton = (title: string, ids: string[], summary?: string) => (
    <Button
      size="small"
      onClick={() => open({ title, summary, event_ids: [], source_ids: ids })}
    >
      View supporting sources
    </Button>
  );
  return (
    <Stack spacing={2.5}>
      <Button
        component={RouterLink}
        to="/nominees"
        sx={{ alignSelf: "start", px: 0 }}
      >
        ← Nomination field
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
              fontSize: 30,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {candidate.nomination_likelihood_pct.toFixed(2)}%
          </Typography>
        </Stack>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, maxWidth: "75ch" }}
        >
          {read.path}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Subjective share among the five tracked candidates · research{" "}
          {read.reviewed_at} ·{" "}
          {latest?.assessments[candidate.id]?.delta_pp === 0
            ? "estimate held"
            : "see research history"}
        </Typography>
      </Box>
      <DetailNavigation
        label="Candidate sections"
        value={section}
        onChange={(value) => setParams({ section: value })}
        items={sections}
      />
      {section === "assessment" && (
        <>
          <Section title="The nomination case">
            <ReadingBlock
              title="Why this estimate"
              text={candidate.forecast_rationale}
            />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 3,
              }}
            >
              <ReadingBlock title="Main advantage" text={read.advantage} />
              <ReadingBlock
                title="Main vulnerability"
                text={read.vulnerability}
              />
            </Box>
            <ReadingBlock title="Expected coalition" text={read.coalition} />
            <Button
              variant="outlined"
              sx={{ alignSelf: "start" }}
              onClick={() =>
                open({
                  title: `${candidate.name}: nomination case`,
                  summary: read.path,
                  event_ids: read.event_ids,
                  showIssuePlayers: false,
                  source_ids: read.source_ids,
                })
              }
            >
              Inspect the basis
            </Button>
          </Section>
          <Section title="What could change the estimate">
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 3,
              }}
            >
              <Box>
                <Typography variant="subtitle2">
                  Conditions that help
                </Typography>
                <Points items={candidate.upside_triggers} />
              </Box>
              <Box>
                <Typography variant="subtitle2">
                  Conditions that hurt
                </Typography>
                <Points items={candidate.downside_triggers} />
              </Box>
            </Box>
            <ReadingBlock
              title="Strongest counterargument"
              text={candidate.strongest_counterargument}
            />
          </Section>
        </>
      )}
      {section === "wargame" && fullReview && (
        <ForecastWargame
          game={fullReview.game}
          reviewedAt={fullReview.reviewedAt}
          candidateId={candidate.id}
        />
      )}
      {section === "positions" && (
        <Section
          title="Policy positions and the record behind them"
          description="A statement, an action and a projected campaign commitment are distinguished. No formal campaign platform is assumed."
        >
          <Stack spacing={3} divider={<Divider />}>
            {Object.entries(candidate.positions).map(([key, position]) => (
              <Box key={key}>
                <Typography variant="subtitle1" sx={{ fontWeight: 650, mb: 1 }}>
                  {data.nomination.issue_definitions.find(
                    (row) => row.id === key,
                  )?.label ?? label(key)}
                </Typography>
                <ResearchText text={position.summary} />
                <Stack spacing={1.5} sx={{ mt: 2 }}>
                  {position.evidence.map((raw, index) => {
                    const row = raw as {
                      text: string;
                      status: string;
                      source_ids: string[];
                    };
                    return (
                      <Box
                        key={index}
                        sx={{ borderLeft: 2, borderColor: "divider", pl: 2 }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {label(row.status)}
                        </Typography>
                        <ResearchText text={row.text} />
                        {row.source_ids.length > 0 &&
                          sourceButton(
                            `${candidate.name}: policy evidence`,
                            row.source_ids,
                            row.text,
                          )}
                      </Box>
                    );
                  })}
                </Stack>
                {position.uncertainty &&
                  !position.uncertainty.startsWith(
                    "This is not a complete 2028 platform",
                  ) && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 1 }}
                    >
                      {position.uncertainty}
                    </Typography>
                  )}
              </Box>
            ))}
          </Stack>
        </Section>
      )}
      {section === "strengths" && (
        <Section title="Strengths and weaknesses">
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 4,
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
                Strengths
              </Typography>
              <Points items={candidate.strengths_for_base} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
                Weaknesses
              </Typography>
              <Points items={candidate.weaknesses_for_base} />
            </Box>
          </Box>
        </Section>
      )}
      {section === "base" && (
        <>
          <Section
            title="Expected base and coalition limits"
            description={base.classification}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 4,
              }}
            >
              <Box>
                <Typography variant="subtitle2">
                  Potential constituencies
                </Typography>
                <Points items={base.likely_constituencies} />
              </Box>
              <Box>
                <Typography variant="subtitle2">
                  Barriers to consolidation
                </Typography>
                <Points items={base.constraints} />
              </Box>
            </Box>
            {base.documented_organizational_relationships.map((row, index) => (
              <Box key={index}>
                <ResearchText text={row.text} />
                {sourceButton(
                  "Organizational relationship",
                  row.source_ids,
                  row.text,
                )}
              </Box>
            ))}
          </Section>
          <Section
            title="Backers and financial networks"
            description="Each relationship keeps its original period and status. Historical funding and business investments are not assumed to be 2028 campaign commitments."
          >
            <Stack spacing={2} divider={<Divider />}>
              {backers.map((row, index) => (
                <Box key={index}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
                    {row.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {row.period} ·{" "}
                    {row.confirmed_2028_commitment
                      ? "Confirmed commitment in the record"
                      : "2028 commitment not established"}
                  </Typography>
                  <ResearchText text={row.relationship} />
                  {sourceButton(row.name, row.source_ids, row.relationship)}
                </Box>
              ))}
            </Stack>
          </Section>
          {Array.isArray(candidate.lobbying_clients_not_donors) && (
            <Section title="Paid clients · separate from political backing">
              {(
                candidate.lobbying_clients_not_donors as {
                  name: string;
                  relationship: string;
                  reporting_window: string;
                  reported_lobbying_income_usd: number | null;
                  source_ids: string[];
                }[]
              ).map((row) => (
                <Box key={row.name}>
                  <Typography variant="subtitle2">{row.name}</Typography>
                  <ResearchText text={row.relationship} />
                  <Typography variant="caption" color="text.secondary">
                    {row.reporting_window} ·{" "}
                    {row.reported_lobbying_income_usd == null
                      ? "income not established"
                      : `reported income $${row.reported_lobbying_income_usd.toLocaleString()}`}
                  </Typography>
                  {sourceButton(row.name, row.source_ids)}
                </Box>
              ))}
            </Section>
          )}
        </>
      )}
      {section === "history" && (
        <>
          <Section title="Political and policy history">
            <Stack spacing={2} divider={<Divider />}>
              {history.map((row, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "150px 1fr" },
                    gap: 1,
                  }}
                >
                  <Typography variant="subtitle2" color="primary">
                    {row.period}
                  </Typography>
                  <Box>
                    <ResearchText text={row.event} />
                    {sourceButton(
                      `${candidate.name}: ${row.period}`,
                      row.source_ids,
                      row.event,
                    )}
                  </Box>
                </Box>
              ))}
            </Stack>
          </Section>
          <Section
            title="Controversies and potential exposure"
            description="Allegations, official findings and prospective scrutiny retain their different evidence statuses."
          >
            <Stack spacing={2} divider={<Divider />}>
              {exposures.map((row, index) => (
                <Box key={index}>
                  <Typography variant="subtitle2">{row.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {label(row.status)}
                  </Typography>
                  <ResearchText text={row.details} />
                  <ReadingBlock
                    title="Political implication"
                    text={row.political_implication}
                  />
                  {sourceButton(row.title, row.source_ids, row.details)}
                </Box>
              ))}
            </Stack>
          </Section>
        </>
      )}
      {section === "evidence" && (
        <Section title="Research basis and limits">
          <ReadingBlock
            title="Latest substantive assessment"
            text={latest?.assessments[candidate.id]?.reason}
          />
          <Typography variant="body2" color="text.secondary">
            {latest?.date} ·{" "}
            {label(
              latest?.assessments[candidate.id]?.review_status ?? "unreviewed",
            )}{" "}
            coverage
          </Typography>
          <Points items={latest?.gaps ?? []} />
          <Button
            variant="outlined"
            sx={{ alignSelf: "start" }}
            onClick={() =>
              open({
                title: `${candidate.name}: assessment evidence`,
                event_ids: read.event_ids,
                showIssuePlayers: false,
                source_ids: read.source_ids,
              })
            }
          >
            Linked assessment evidence
          </Button>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2">
              The original research record is available for audit. It does not
              replace the dated interpretation shown in this profile.
            </Typography>
            <Button
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(candidate, null, 2)], {
                    type: "application/json",
                  }),
                );
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `${candidate.id}-research.json`;
                anchor.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Download candidate research
            </Button>
            {read.person_id && (
              <Button component={RouterLink} to={`/people/${read.person_id}`}>
                Full political profile
              </Button>
            )}
          </Paper>
        </Section>
      )}
    </Stack>
  );
}
