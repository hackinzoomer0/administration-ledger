import { Box, Button, Collapse, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { data } from "../lib/data";
export function AssessmentMeta() {
  const [open, setOpen] = useState(false);
  const [published, setPublished] = useState("");
  useEffect(() => {
    let active = true;
    fetch(`${import.meta.env.BASE_URL}version.json`)
      .then((response) => (response.ok ? response.json() : undefined))
      .then((value) => {
        if (active && value?.built_at)
          setPublished(value.built_at.slice(0, 10));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return (
    <Box>
      <Stack
        direction="row"
        sx={{ gap: 1.5, alignItems: "center", flexWrap: "wrap" }}
      >
        <Typography variant="caption" color="text.secondary">
          Research reviewed through {data.assessment.research_as_of}
        </Typography>
        {published && (
          <Typography variant="caption" color="text.secondary">
            Published {published}
          </Typography>
        )}
        <Button
          size="small"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          What this review covers
        </Button>
      </Stack>
      <Collapse in={open}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, maxWidth: "75ch" }}
        >
          {data.assessment.review.scope} Last change to the assessment:{" "}
          {data.assessment.last_substantive_change}. Publication can occur
          without a change in the political assessment.
        </Typography>
      </Collapse>
    </Box>
  );
}
