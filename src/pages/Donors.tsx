import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Link as RouterLink } from "react-router-dom";
import { data } from "../lib/data";
import { Directory } from "../components/Directory";
import { DetailFields } from "../components/DetailFields";
import { EntityChips } from "../components/EntityChips";
import { ReadingBlock } from "../components/ReadingBlock";
import { Section } from "../components/Section";
import { ContextNav } from "../components/ContextNav";
export default function Donors() {
  return (
    <>
      <ContextNav area="research" />
      <Directory
        title="Money & access"
        description="See who gives money, invests or does business with people connected to the administration. Each profile explains the relationship; a financial connection alone does not prove political influence."
        path="donors"
        rows={data.donors}
        subtitle={(row) => row.identity || row.amounts?.[0] || ""}
        factions={(row) => row.factions ?? []}
        badges={(row) => <EntityChips factions={row.factions?.slice(0, 2)} />}
        details={(row) => (
          <Stack spacing={3}>
            <EntityChips
              factions={row.factions}
              issues={row.supports ?? row.issues}
            />
            <Section title="The relationship and its stakes">
              <ReadingBlock title="Who this is" text={row.identity} />
              <ReadingBlock
                title="Recorded financial relationships"
                text={[...new Set(row.amounts)].slice(0, 3).join("\n\n")}
              />
              <ReadingBlock
                title="Potential political or financial return"
                text={row.gain}
              />
              <ReadingBlock title="Assessment of interests" text={row.motive} />
              <Typography variant="caption" color="text.secondary">
                Historical support and commercial relationships are not assumed
                to be current nomination commitments. A quid pro quo requires
                separate evidence.
              </Typography>
            </Section>
            <Section title="Who the relationship reaches">
              {row.people
                .map((id) => data.people.find((person) => person.id === id))
                .filter((person) => !!person)
                .map((person) => (
                  <Box key={person.id}>
                    <Button component={RouterLink} to={`/people/${person.id}`}>
                      {person.name}
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      {person.role}
                    </Typography>
                  </Box>
                ))}
            </Section>
            <Accordion disableGutters elevation={0} variant="outlined">
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                Complete relationship record and evidence qualifications
              </AccordionSummary>
              <AccordionDetails>
                <DetailFields value={row} depth={1} />
              </AccordionDetails>
            </Accordion>
          </Stack>
        )}
      />
    </>
  );
}
