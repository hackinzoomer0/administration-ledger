import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Link as RouterLink, useParams } from "react-router-dom";
import { data } from "../lib/data";
import { substantiveSnapshots, latestWargame } from "../lib/selectors";
import { AssessmentMeta } from "../components/AssessmentMeta";
import { CandidateList } from "../components/CandidateList";
import { ReadingBlock } from "../components/ReadingBlock";
import { ResearchText } from "../components/ResearchText";
import { Section } from "../components/Section";
import { ForecastWargame } from "../components/ForecastWargame";
import { CandidateProfile } from "../components/CandidateProfile";
export default function Nominees() {
  const { id } = useParams();
  const forecast = data.nomination;
  const history = substantiveSnapshots(forecast.tracking.history);
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
      <CandidateProfile key={candidate.id} candidate={candidate} read={read} />
    );
  const fullReview = latestWargame(history);
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
      {fullReview && (
        <ForecastWargame
          game={fullReview.game}
          reviewedAt={fullReview.reviewedAt}
          snapshotId={fullReview.snapshotId}
        />
      )}
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
                <Typography variant="subtitle2">
                  {row.date} · {Object.keys(row.probabilities_pct).length}
                  -candidate field
                </Typography>
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
