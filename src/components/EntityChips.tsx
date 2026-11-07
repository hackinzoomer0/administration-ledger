import { Chip, Stack } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { factionNames, issueNames } from "../lib/data";
export function EntityChips({
  factions = [],
  issues = [],
}: {
  factions?: string[];
  issues?: string[];
}) {
  return (
    <Stack direction="row" sx={{ gap: 0.75, flexWrap: "wrap" }}>
      {factions.map((id) => (
        <Chip
          key={`f-${id}`}
          size="small"
          variant="outlined"
          color="primary"
          label={factionNames[id] ?? id}
          component={RouterLink}
          to={`/factions/${id}`}
          clickable
        />
      ))}
      {issues.map((id) => (
        <Chip
          key={`i-${id}`}
          size="small"
          label={issueNames[id] ?? id}
          component={RouterLink}
          to={`/issues/${id}`}
          clickable
        />
      ))}
    </Stack>
  );
}
