import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        gap: 2,
        alignItems: "start",
        mb: 3,
        flexWrap: "wrap",
      }}
    >
      <Box sx={{ maxWidth: 820 }}>
        <Typography variant="overline" color="primary">
          {eyebrow ?? "Administration Ledger"}
        </Typography>
        <Typography variant="h3" component="h1" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Typography color="text.secondary">{description}</Typography>
      </Box>
      {action}
    </Box>
  );
}
