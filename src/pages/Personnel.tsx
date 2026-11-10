import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Link as RouterLink,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ContextNav } from "../components/ContextNav";
import { DetailNavigation } from "../components/DetailNavigation";
import { ReadingBlock } from "../components/ReadingBlock";
import { Section } from "../components/Section";
import { useEvidence } from "../lib/evidence-context";
import { label, safeUrl } from "../lib/selectors";
import {
  impeachments,
  impeachmentPercent as pct,
  latestImpeachmentReview as latest,
  rankedImpeachmentCases,
} from "../lib/impeachments";
import type { ImpeachmentForecast } from "../lib/types";

function Sources({ ids }: { ids: string[] }) {
  return (
    <Stack spacing={1}>
      {impeachments.sources
        .filter((s) => ids.includes(s.id))
        .map((s) => (
          <Box key={s.id}>
            <Link
              href={safeUrl(s.url) ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
            >
              {s.title}
            </Link>
            <Typography
              variant="caption"
              sx={{ display: "block" }}
              color="text.secondary"
            >
              {s.publication_date ? `Published ${s.publication_date} · ` : ""}
              Checked {s.accessed_on}. {s.limitation}
            </Typography>
          </Box>
        ))}
      {!ids.length && (
        <Typography variant="body2">
          No case-specific external sources linked yet; this is a coverage gap.
        </Typography>
      )}
    </Stack>
  );
}

function Probabilities({ forecast }: { forecast: ImpeachmentForecast }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
        gap: 2,
      }}
    >
      {(
        [
          ["House impeachment", forecast.house_pct, forecast.outcomes.house],
          [
            "Senate conviction if impeached",
            forecast.conviction_given_impeachment_pct,
            forecast.outcomes.conviction,
          ],
          [
            "Impeachment and conviction overall",
            forecast.joint_pct,
            forecast.outcomes.conviction,
          ],
        ] as const
      ).map(([name, value, status]) => (
        <Box key={name}>
          <Typography variant="h5" component="p">
            {status === "occurred" ? "Occurred" : pct(value)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {name}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function Momentum() {
  const evidence = useEvidence();
  const observed = new Set(latest.context.observation_ids);
  return (
    <Section title="Could one conviction make the next one easier?">
      <Chip
        label={label(latest.context.state)}
        size="small"
        sx={{ alignSelf: "start" }}
      />
      <Typography>{latest.context.assessment}</Typography>
      {latest.context.pathways.map((path) => (
        <ReadingBlock key={path.id} title={path.title} text={path.assessment} />
      ))}
      <Typography variant="body2" color="text.secondary">
        Cases can move together even when allegations are unrelated. A
        conviction does not prove another person’s misconduct. Any forecast
        change needs its own explanation; there is no automatic percentage
        boost.
      </Typography>
      {impeachments.momentum_observations
        .filter((row) => observed.has(row.id))
        .map((row) => (
          <Box key={row.id}>
            <Typography variant="subtitle2">
              {row.date} · {label(row.kind)}
            </Typography>
            <ReadingBlock title="What changed" text={row.assessment} />
            <ReadingBlock
              title="Coalition and political response"
              text={`${row.coalition}\n\n${row.political_response}`}
            />
            <ReadingBlock title="How far it carries" text={row.scope} />
            <ReadingBlock title="Countercase" text={row.countercase} />
            <Sources ids={row.source_ids ?? []} />
            {!!row.event_ids.length && (
              <Button
                onClick={() =>
                  evidence({
                    title: "Momentum evidence",
                    summary: row.assessment,
                    event_ids: row.event_ids,
                  })
                }
              >
                Inspect linked momentum episodes
              </Button>
            )}
          </Box>
        ))}
      {observed.size === 0 && (
        <Typography variant="body2">
          No verified momentum milestones are recorded in this review.
        </Typography>
      )}
    </Section>
  );
}

function ForecastHistory({ caseId }: { caseId?: string }) {
  return (
    <Section title="Dated forecast history">
      <Typography variant="body2">
        Earlier estimates and their evidence are preserved. Later outcomes do
        not rewrite the original forecast.
      </Typography>
      {[...impeachments.history].reverse().map((review) => (
        <Accordion
          key={review.id}
          disableGutters
          variant="outlined"
          elevation={0}
          slotProps={{ transition: { unmountOnExit: true } }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>
              {review.as_of.replace("T", " ").replace("Z", " UTC")} ·{" "}
              {label(review.type)}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Typography>{review.summary}</Typography>
              <Typography variant="caption">
                Deadline {review.deadline}
              </Typography>
              <Button
                component={RouterLink}
                to={`/research?section=${["daily", "weekly"].includes(review.type) ? "briefings" : "operations"}&run=${review.run_id}`}
              >
                Inspect linked review record
              </Button>
              <Typography variant="body2">{review.coverage}</Typography>
              <ReadingBlock
                title="Shared political conditions at the time"
                text={review.context.assessment}
              />
              {impeachments.cases
                .filter((c) => !caseId || c.id === caseId)
                .map((c) => {
                  const f = review.forecasts[c.id];
                  if (!f) return null;
                  return (
                    <Stack key={c.id} spacing={1}>
                      <Typography variant="subtitle1">{c.name}</Typography>
                      <Probabilities forecast={f} />
                      <Typography variant="body2">{f.reason}</Typography>
                      <ReadingBlock
                        title="Case and defense at the time"
                        text={`${f.basis.allegations}\n\n${f.basis.defense}`}
                      />
                      <ReadingBlock
                        title="Momentum at the time"
                        text={f.momentum.assessment}
                      />
                      <Sources ids={f.basis.source_ids ?? []} />
                    </Stack>
                  );
                })}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}
    </Section>
  );
}

export default function Personnel() {
  const { caseId } = useParams();
  const [params, setParams] = useSearchParams();
  const section = params.get("section") ?? "assessment";
  const [metric, setMetric] = useState<
    "joint_pct" | "house_pct" | "conviction_given_impeachment_pct"
  >("joint_pct");
  const evidence = useEvidence();
  const person = impeachments.cases.find((c) => c.id === caseId);
  if (caseId && !person)
    return (
      <Stack spacing={2}>
        <Alert severity="info">Personnel case not found.</Alert>
        <Button component={RouterLink} to="/administration/personnel">
          All personnel cases
        </Button>
      </Stack>
    );
  const forecast = person ? latest.forecasts[person.id] : undefined;
  const tab = ["assessment", "evidence", "history", "methods"].includes(section)
    ? section
    : "assessment";
  return (
    <Stack spacing={3}>
      <ContextNav area="administration" />
      <Box>
        <Typography variant="overline" color="primary">
          Administration · personnel accountability
        </Typography>
        <Typography variant="h3" component="h1">
          {person?.name ?? "Personnel & impeachment"}
        </Typography>
        {person && (
          <Typography color="text.secondary">{person.office}</Typography>
        )}
        <Typography variant="body2" color="text.secondary">
          Research as of {latest.as_of.replace("T", " ").replace("Z", " UTC")} ·
          Forecasts through {latest.deadline}
        </Typography>
      </Box>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button component={RouterLink} to="/people">
          Browse personnel profiles
        </Button>
        {person && (
          <Button component={RouterLink} to="/administration/personnel">
            All impeachment cases
          </Button>
        )}
        {person?.person_id && (
          <Button component={RouterLink} to={`/people/${person.person_id}`}>
            Full person profile
          </Button>
        )}
      </Stack>
      <Alert severity="info">
        Subjective political forecasts, not criminal-guilt judgments. Watchlist
        means unestimated, not zero risk. Close rankings are uncertain.
      </Alert>
      <DetailNavigation
        value={tab}
        onChange={(value) => setParams({ section: value })}
        label="Personnel sections"
        items={[
          ["assessment", "Assessment"],
          ["evidence", "Evidence & proceedings"],
          ["history", "Forecast history"],
          ["methods", "Methods & limits"],
        ]}
      />
      {tab === "assessment" && (
        <>
          {person && forecast ? (
            <>
              <Section title={person.title}>
                <Probabilities forecast={forecast} />
                <Typography>{forecast.reason}</Typography>
                {forecast.joint_range_pct && (
                  <Typography variant="body2" color="text.secondary">
                    Overall judgment range: {forecast.joint_range_pct[0]}–
                    {forecast.joint_range_pct[1]}%. {label(forecast.confidence)}{" "}
                    confidence; this is not a statistical interval.
                  </Typography>
                )}
                <ReadingBlock
                  title="How another case could affect this one"
                  text={forecast.momentum.assessment}
                />
                <ReadingBlock
                  title="What could change the forecast"
                  text={forecast.basis.watch}
                />
                <Button onClick={() => setParams({ section: "evidence" })}>
                  Inspect case evidence and defense
                </Button>
              </Section>
            </>
          ) : (
            <Section title="Who is most exposed?" description={latest.summary}>
              <Typography variant="body2" color="text.secondary">
                {latest.coverage}
              </Typography>
              <TextField
                select
                label="Order cases by"
                value={metric}
                onChange={(e) => setMetric(e.target.value as typeof metric)}
                size="small"
                sx={{ maxWidth: 380 }}
              >
                <MenuItem value="joint_pct">
                  Impeachment and conviction overall
                </MenuItem>
                <MenuItem value="house_pct">House impeachment</MenuItem>
                <MenuItem value="conviction_given_impeachment_pct">
                  Conviction if impeached
                </MenuItem>
              </TextField>
              {rankedImpeachmentCases(metric).map((c) => (
                <Box
                  key={c.id}
                  sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}
                >
                  <Button
                    component={RouterLink}
                    to={`/administration/personnel/${c.id}`}
                    sx={{ px: 0 }}
                  >
                    {c.name} ·{" "}
                    {latest.forecasts[c.id].house_pct === null
                      ? "Watchlist"
                      : "View forecast"}
                  </Button>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    {c.office}
                  </Typography>
                  <Probabilities forecast={latest.forecasts[c.id]} />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {latest.forecasts[c.id].reason}
                  </Typography>
                </Box>
              ))}
            </Section>
          )}
          <Momentum />
        </>
      )}
      {tab === "evidence" && (
        <>
          {impeachments.cases
            .filter((c) => !person || c.id === person.id)
            .map((c) => (
              <Section key={c.id} title={`${c.name}: case and defense`}>
                <ReadingBlock
                  title="Allegations and established procedural facts"
                  text={c.allegations}
                />
                <ReadingBlock
                  title="Defense and counterevidence"
                  text={c.defense}
                />
                <Typography variant="body2">
                  Office eligibility: {label(c.eligibility)} · Tenure:{" "}
                  {label(c.tenure)}
                </Typography>
                <Sources ids={c.source_ids ?? []} />
                {!!c.event_ids.length && (
                  <Button
                    onClick={() =>
                      evidence({
                        title: `${c.name}: linked episodes`,
                        summary: c.allegations,
                        event_ids: c.event_ids,
                      })
                    }
                  >
                    Inspect linked ledger episodes
                  </Button>
                )}
                {impeachments.proceedings
                  .filter((p) => p.case_id === c.id)
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((p) => (
                    <Box key={p.id}>
                      <Typography variant="subtitle2">
                        {p.date} · {label(p.kind)}
                        {impeachments.proceedings.some(
                          (r) => r.supersedes === p.id,
                        )
                          ? " · Superseded by a later correction"
                          : ""}
                      </Typography>
                      <Typography variant="body2">{p.summary}</Typography>
                      <Sources ids={p.source_ids ?? []} />
                      {!!p.event_ids.length && (
                        <Button
                          onClick={() =>
                            evidence({
                              title: `${c.name}: proceeding evidence`,
                              summary: p.summary,
                              event_ids: p.event_ids,
                            })
                          }
                        >
                          Inspect proceeding episodes
                        </Button>
                      )}
                    </Box>
                  ))}
                {!impeachments.proceedings.some((p) => p.case_id === c.id) && (
                  <Typography variant="body2">
                    No procedural milestones have been entered in this register.
                    This is not a finding that no proceedings exist.
                  </Typography>
                )}
              </Section>
            ))}
          <Section title="Dated follow-up checks">
            {impeachments.tests
              .filter((t) => !person || !t.case_id || t.case_id === person.id)
              .map((t) => (
                <Box key={t.id}>
                  <Typography variant="subtitle2">
                    {t.resolve_by} · {label(t.status)}
                  </Typography>
                  <Typography variant="body2">{t.claim}</Typography>
                  {t.resolution && (
                    <Typography variant="body2">{t.resolution}</Typography>
                  )}
                </Box>
              ))}
          </Section>
        </>
      )}
      {tab === "history" && <ForecastHistory caseId={person?.id} />}
      {tab === "methods" && (
        <Section title="How to read these forecasts">
          <ReadingBlock
            title="Outcome and deadline"
            text={impeachments.methodology.target}
          />
          <ReadingBlock
            title="Probabilities"
            text={impeachments.methodology.arithmetic}
          />
          <ReadingBlock title="Limits" text={impeachments.methodology.limits} />
          <ReadingBlock
            title="Shared momentum"
            text={impeachments.methodology.momentum_rule}
          />
          <ReadingBlock
            title="Departure from office"
            text={impeachments.methodology.departure_rule}
          />
          <ReadingBlock
            title="Updates"
            text={impeachments.methodology.cadence}
          />
          <Typography variant="body2">
            Tabling, referral, resignation and dismissal do not count as
            impeachment or Senate conviction. The deadline includes proceedings
            after departure; an unfinished trial is not a conviction by that
            deadline.
          </Typography>
          <Sources ids={["senate-rules", "belknap"]} />
        </Section>
      )}
    </Stack>
  );
}
