import {
  Box,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { data, factionNames } from "../lib/data";
import { useEvidence } from "../lib/evidence-context";
import { Section } from "./Section";
import { ReadingBlock } from "./ReadingBlock";
export function PowerShifts() {
  const open = useEvidence();
  const method = data.assessment.power_method;
  return (
    <Section
      title="Who gains and loses agenda access"
      description="The Wiles–Miller transition, quantified as an explicit role-based scenario."
    >
      <TableContainer>
        <Table aria-label="Projected agenda access changes">
          <TableHead>
            <TableRow>
              <TableCell>Faction / actor</TableCell>
              <TableCell>Current</TableCell>
              <TableCell>Post-handover</TableCell>
              <TableCell>Change</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.assessment.power_shifts.map((row) => (
              <TableRow key={row.faction_id}>
                <TableCell>
                  {factionNames[row.faction_id]}
                  <Typography variant="caption" sx={{ display: "block" }}>
                    {row.actor}
                  </Typography>
                </TableCell>
                <TableCell>{row.before}/5</TableCell>
                <TableCell>{row.after}/5</TableCell>
                <TableCell>
                  {row.after - row.before > 0 ? "+" : ""}
                  {row.after - row.before}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2">{method.status}</Typography>
      <Stack spacing={2}>
        {data.assessment.power_shifts.map((row) => (
          <Box key={row.faction_id}>
            <ReadingBlock title={row.role_change} text={row.implication} />
          </Box>
        ))}
      </Stack>
      <ReadingBlock
        title="Projected policy implications"
        text={method.policy_projection}
      />
      <ReadingBlock
        title="What this scenario depends on"
        text={method.condition}
      />
      <ReadingBlock title={method.title} text={method.scale} />
      <Button
        onClick={() =>
          open({
            title: "Staffing transition and prospective constraints",
            event_ids: method.event_ids,
          })
        }
      >
        Inspect the evidence and limits
      </Button>
    </Section>
  );
}
