import { Box, Typography } from "@mui/material";
import { ResearchText } from "./ResearchText";
export function ReadingBlock({
  title,
  text,
}: {
  title: string;
  text?: string;
}) {
  if (!text) return null;
  return (
    <Box sx={{ maxWidth: "72ch" }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <ResearchText text={text} />
    </Box>
  );
}
