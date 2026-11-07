import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useNavigate, useParams } from "react-router-dom";
import { activeFactions, data } from "../lib/data";
import { PageHeader } from "../components/PageHeader";
import { Section } from "../components/Section";
import { ResearchText } from "../components/ResearchText";
import { DetailFields } from "../components/DetailFields";

export default function Issues() {
  const { id } = useParams();
  const navigate = useNavigate();
  const issue = data.issues.find((row) => row.code === id);
  if (id && !issue)
    return (
      <Alert severity="warning">
        Issue not found.{" "}
        <Button onClick={() => navigate("/issues")}>All issues</Button>
      </Alert>
    );
  if (!issue)
    return (
      <Stack spacing={3}>
        <PageHeader
          title="Issues and decision channels"
          description="Start with the decision at stake, then follow the actors, competing interests and unresolved outcomes."
        />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
            gap: 2,
          }}
        >
          {data.issues.map((row) => (
            <Card key={row.code} variant="outlined">
              <CardActionArea component={RouterLink} to={`/issues/${row.code}`}>
                <CardContent>
                  <Typography variant="h6">{row.name}</Typography>
                  <Typography sx={{ my: 1 }}>{row.decision}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {row.heldBy}
                  </Typography>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${data.events.filter((event) => event.issues.includes(row.code)).length} records`}
                    sx={{ mt: 2 }}
                  />
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Stack>
    );
  const stances = activeFactions.filter(
    (faction) => faction.positions[issue.code],
  );
  const holders = data.meta.holders as Record<string, unknown>;
  return (
    <Stack spacing={3}>
      <Button component={RouterLink} to="/issues" sx={{ alignSelf: "start" }}>
        ← All issues
      </Button>
      <PageHeader
        title={issue.name}
        description={issue.decision}
        action={
          <Button
            component={RouterLink}
            to={`/ledger?issue=${issue.code}`}
            variant="outlined"
          >
            View dated evidence
          </Button>
        }
      />
      <Section title="Who holds the decision">
        <ResearchText text={issue.heldBy} />
        <DetailFields value={holders?.[issue.code]} />
      </Section>
      <Section title="What remains open">
        <ResearchText text={issue.pending} />
      </Section>
      <Section
        title="Competing faction positions"
        description="These summaries retain their original dates and evidence qualifications. Later episodes may refine older conclusions."
      >
        {stances.map((faction) => (
          <Box key={faction.id}>
            <Button component={RouterLink} to={`/factions/${faction.id}`}>
              {faction.name}
            </Button>
            {faction.positions[issue.code].map((block, index) => (
              <Box key={index} sx={{ my: 2 }}>
                <Typography variant="subtitle2">{block.title}</Typography>
                {block.paras.map((paragraph, i) => (
                  <Box key={i} sx={{ mb: 1 }}>
                    <ResearchText text={paragraph} />
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        ))}
      </Section>
    </Stack>
  );
}
