import { Box, Button, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { data } from "../lib/data";
import { ReadingBlock } from "./ReadingBlock";
export function FactionPosition({
  issue,
  faction,
}: {
  issue: string;
  faction: string;
}) {
  const stance = data.issueAssessments[issue]?.factions.find(
    (row) => row.faction_id === faction,
  );
  if (!stance)
    return (
      <Typography variant="body2">
        No distinct faction position is documented; inspect the dated issue
        record.
      </Typography>
    );
  const backers = data.donors.filter(
    (row) =>
      row.factions.includes(faction) &&
      (row.issues?.includes(issue) || row.supports?.includes(issue)),
  );
  return (
    <Box>
      <ReadingBlock title="Position in this dispute" text={stance.position} />
      <ReadingBlock
        title="Actions supporting that position"
        text={stance.actions}
      />
      <ReadingBlock title="Goals and interests" text={stance.goals} />
      {stance.actors.length > 0 && (
        <ReadingBlock
          title="Individual actors and incentives"
          text={stance.actors.join("\n\n")}
        />
      )}
      <ReadingBlock
        title="Consistency and disputes"
        text={stance.observations.join("\n\n")}
      />
      <Typography variant="subtitle2" sx={{ mt: 2 }}>
        Financial relationships relevant to this issue
      </Typography>
      {backers.length ? (
        backers.slice(0, 5).map((row) => (
          <Box key={row.id}>
            <Button component={RouterLink} to={`/donors/${row.id}`}>
              {row.name}
            </Button>
            <Typography variant="body2" color="text.secondary">
              {row.amounts[0] || row.identity}
            </Typography>
          </Box>
        ))
      ) : (
        <Typography variant="body2">
          No specific financial channel is established in this record.
        </Typography>
      )}
    </Box>
  );
}
