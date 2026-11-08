import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { data, factionNames } from "../lib/data";
import { Section } from "./Section";
import { ReadingBlock } from "./ReadingBlock";
export function TopicPlayers({ issue }: { issue: string }) {
  const actors = data.issueAssessments[issue].actors;
  return (
    <Section
      title="Major players, goals and financial relationships"
      description="Issue-specific positions from existing research; goals are assessed incentives. Historical dates apply. Financial exposure is distinct from donations and does not prove influence."
    >
      <Stack divider={<Divider />} spacing={3}>
        {actors.map((actor) => {
          const person = data.people.find((row) => row.id === actor.person_id)!;
          return (
            <Box key={actor.person_id}>
              <Stack
                direction="row"
                sx={{
                  justifyContent: "space-between",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <Button
                  component={RouterLink}
                  to={`/people/${person.id}`}
                  sx={{ px: 0 }}
                >
                  {person.name}
                </Button>
                <Typography variant="caption" color="text.secondary">
                  {actor.faction_id
                    ? factionNames[actor.faction_id]
                    : "External actor · no administration faction"}
                </Typography>
              </Stack>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 1.5 }}
              >
                {actor.role}
              </Typography>
              {actor.basis_note.startsWith("Role-based") && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 1.5 }}
                >
                  {actor.basis_note}
                </Typography>
              )}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "minmax(0, 1.4fr) minmax(0, 1fr)",
                  },
                  gap: 3,
                }}
              >
                <Stack spacing={1.5}>
                  <ReadingBlock
                    title="What they want and how they can act"
                    text={actor.position}
                  />
                  <ReadingBlock
                    title="What they could gain"
                    text={actor.goal}
                  />
                </Stack>
                <Box>
                  <Typography variant="subtitle2">
                    Relevant financial relationships
                  </Typography>
                  {actor.financial_relationships.length ? (
                    actor.financial_relationships.map((row, index) => (
                      <Box key={index} sx={{ mt: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.name}
                        </Typography>
                        <Typography variant="body2">
                          {row.relationship}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.relevance}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No issue-specific financial relationship established here.
                      General connections remain in the person’s full profile.
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Section>
  );
}
