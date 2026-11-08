import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
export function PowerShifts() {
  const open = useEvidence();
  const method = data.assessment.power_method;
  return (
    <Section
      title="How leadership changes could affect policy"
      description={method.condition}
    >
      <Stack spacing={2}>
        {data.assessment.power_shifts.map((row) => (
          <Box key={row.faction_id}>
            <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
              {row.actor}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {row.role_change}
            </Typography>
            <Typography variant="body2">{row.implication}</Typography>
          </Box>
        ))}
      </Stack>
      <TableContainer>
        <Table aria-label="Projected agenda access changes">
          <TableHead>
            <TableRow>
              <TableCell>Adviser</TableCell>
              <TableCell>Current</TableCell>
              <TableCell>If the handover happens</TableCell>
              <TableCell>Change</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.assessment.power_shifts.map((row) => (
              <TableRow key={row.faction_id}>
                <TableCell>
                  {row.actor}
                  <Typography variant="caption" sx={{ display: "block" }}>
                    {factionNames[row.faction_id]}
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
      <ReadingBlock
        title="Which policies could be affected"
        text={method.policy_projection}
      />
      <Accordion disableGutters elevation={0} variant="outlined">
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">{method.title}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2">{method.scale}</Typography>
        </AccordionDetails>
      </Accordion>
      <Button
        onClick={() =>
          open({
            title: "What is confirmed about the Wiles–Miller job changes",
            event_ids: method.event_ids,
          })
        }
      >
        Inspect the evidence and limits
      </Button>
    </Section>
  );
}
