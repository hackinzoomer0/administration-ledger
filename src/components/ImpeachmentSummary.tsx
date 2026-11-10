import { Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { Section } from "./Section";
import { latestImpeachmentReview } from "../lib/impeachments";

export function ImpeachmentSummary() {
  return (
    <Section title="Personnel accountability & impeachment">
      <Typography>{latestImpeachmentReview.summary}</Typography>
      <Typography variant="body2" color="text.secondary">
        A first conviction could change the prospects for unrelated cases.
        Follow the evidence, political response and each person’s forecast.
      </Typography>
      <Button
        component={RouterLink}
        to="/administration/personnel"
        variant="outlined"
      >
        View personnel & impeachment forecasts
      </Button>
    </Section>
  );
}
