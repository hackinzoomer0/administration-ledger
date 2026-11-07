import { useSearchParams, Link as RouterLink } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  Link,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { data } from "../lib/data";
import { ContextNav } from "../components/ContextNav";
import { Section } from "../components/Section";
import { DetailFields } from "../components/DetailFields";
import { ReadingBlock } from "../components/ReadingBlock";
import type { Json } from "../lib/types";
function paragraphs(value: unknown): string {
  return typeof value === "string"
    ? value
    : Array.isArray(value)
      ? value.filter((row) => typeof row === "string").join("\n\n")
      : "";
}
export default function Research() {
  const [params, setParams] = useSearchParams();
  const section = params.get("section") ?? "briefings";
  const runs = Object.entries(data.runs).sort(([a], [b]) => b.localeCompare(a));
  const technical = [
    "ui_review",
    "workflow_setup",
    "workflow_and_framework_migration",
    "product_assessment_projection",
  ];
  const filtered = runs.filter(([, value]) => {
    const row = value as Record<string, Json>;
    const isTechnical = technical.includes(String(row.type ?? ""));
    return section === "operations" ? isTechnical : !isTechnical;
  });
  return (
    <Stack spacing={3}>
      <ContextNav area="research" />
      <Box>
        <Typography variant="overline" color="primary">
          Evidence behind the assessment
        </Typography>
        <Typography variant="h3" component="h1">
          Research &amp; review history
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: "70ch" }}>
          Daily briefings and source records explain how the current assessment
          was reached. Technical activity is kept separate.
        </Typography>
      </Box>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button component={RouterLink} to="/ledger" variant="outlined">
          Search events
        </Button>
        <Button component={RouterLink} to="/people">
          People
        </Button>
        <Button component={RouterLink} to="/donors">
          Money &amp; access
        </Button>
      </Stack>
      <Tabs
        value={
          ["briefings", "methods", "sources", "operations"].includes(section)
            ? section
            : "briefings"
        }
        onChange={(_, value: string) => setParams({ section: value })}
        variant="scrollable"
        aria-label="Research sections"
      >
        <Tab value="briefings" label="Daily & weekly reviews" />
        <Tab value="methods" label="Methods & limits" />
        <Tab value="sources" label="Sources" />
        <Tab value="operations" label="Processing history" />
      </Tabs>
      {["briefings", "operations"].includes(section) && (
        <Section
          title={
            section === "operations" ? "Processing history" : "Review archive"
          }
          description={
            section === "operations"
              ? "Imports, interface work and validation are not political assessments."
              : "Open a review for coverage, changes, unresolved claims and its full record."
          }
        >
          {filtered.map(([id, value]) => {
            const row = value as Record<string, Json>;
            return (
              <Accordion
                key={id}
                disableGutters
                elevation={0}
                variant="outlined"
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box>
                    <Typography variant="subtitle2">
                      {id.replace(/-/g, " ").replace(/^2026 11 /, "November ")}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {paragraphs(row.summary || row.scope).slice(0, 200) ||
                        "Review coverage and evidence record"}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <ReadingBlock
                      title="Summary and scope"
                      text={paragraphs(row.summary || row.scope)}
                    />
                    <ReadingBlock
                      title="Changes"
                      text={paragraphs(row.changes || row.changed_entries)}
                    />
                    <ReadingBlock
                      title="Unresolved claims"
                      text={paragraphs(row.unresolved_claims)}
                    />
                    <Accordion disableGutters elevation={0}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        Full review record
                      </AccordionSummary>
                      <AccordionDetails>
                        <DetailFields value={row} depth={1} />
                      </AccordionDetails>
                    </Accordion>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Section>
      )}
      {section === "methods" && (
        <>
          <Section title="How to read the assessments">
            <ReadingBlock
              title="Power"
              text="Formal authority, access, negotiating influence and observed outcomes are distinct. There is no validated overall numerical ranking of power."
            />
            <ReadingBlock
              title="Nomination estimates"
              text={data.nomination.forecast_methodology.target}
            />
            <Typography variant="body2">
              Estimates are subjective and uncalibrated. Historical donations,
              investments, paid representation, stated preferences and confirmed
              campaign backing are different relationships.
            </Typography>
          </Section>
          {Object.entries(data.report).map(([id, record]) => (
            <Accordion key={id} disableGutters elevation={0} variant="outlined">
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">
                  {((record as Record<string, Json>).title as string) || id}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <DetailFields value={record} depth={1} />
              </AccordionDetails>
            </Accordion>
          ))}
        </>
      )}
      {section === "sources" && (
        <Section
          title="Nomination source registry"
          description="Verification status and dates are retained in each full source record. Event sources are also available in the event ledger."
        >
          <Stack spacing={2} divider={<Divider />}>
            {data.nomination.sources.map((source) => (
              <Box key={source.id}>
                <Link
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {source.publisher} ·{" "}
                  {source.publication_date || "Date unspecified"}
                </Link>
                <Typography variant="body2">{source.description}</Typography>
              </Box>
            ))}
          </Stack>
        </Section>
      )}
    </Stack>
  );
}
