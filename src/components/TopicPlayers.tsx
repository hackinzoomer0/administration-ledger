import { Box, Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { data } from "../lib/data";
import { Section } from "./Section";
import { EntityChips } from "./EntityChips";
import { ReadingBlock } from "./ReadingBlock";
export function TopicPlayers({ issue }: { issue: string }) {
  const read = data.issueAssessments[issue];
  return (
    <Section
      title="Major players, goals and financial relationships"
      description="Faction homes and recorded interests are analytical placements. A donor relationship does not establish control of a policy decision."
    >
      <Stack spacing={3}>
        {read.player_ids
          .map((id) => data.people.find((person) => person.id === id))
          .filter((person) => !!person)
          .map((person) => {
            const donors = data.donors.filter(
              (donor) =>
                donor.people.includes(person.id) ||
                ((person.donors as string[] | undefined) ?? []).includes(
                  donor.id,
                ),
            );
            return (
              <Box key={person.id}>
                <Button
                  component={RouterLink}
                  to={`/people/${person.id}`}
                  sx={{ px: 0 }}
                >
                  {person.name}
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {person.role}
                </Typography>
                <EntityChips factions={person.home ? [person.home] : []} />
                {!person.home && (
                  <Typography variant="caption" color="text.secondary">
                    External actor · no administration faction assignment
                  </Typography>
                )}
                <ReadingBlock
                  title="Goals and incentives"
                  text={person.drive || person.read}
                />
                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                  Recorded backers and financial channels
                </Typography>
                {donors.length ? (
                  donors.slice(0, 4).map((donor) => (
                    <Box key={donor.id}>
                      <Button
                        component={RouterLink}
                        to={`/donors/${donor.id}`}
                        size="small"
                      >
                        {donor.name}
                      </Button>
                      <Typography variant="caption" color="text.secondary">
                        {donor.amounts[0] || donor.identity}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2">
                    No resolved financial backer is established in this record.
                  </Typography>
                )}
              </Box>
            );
          })}
      </Stack>
    </Section>
  );
}
