import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { data } from "../lib/data";
import { useEvidence } from "../lib/evidence-context";
import { AssessmentMeta } from "../components/AssessmentMeta";
import { CandidateList } from "../components/CandidateList";
import { PowerList } from "../components/PowerList";
import { Section } from "../components/Section";
export default function Home() {
  const evidence = useEvidence();
  const leader = [...data.nomination.candidates].sort(
    (a, b) => b.nomination_likelihood_pct - a.nomination_likelihood_pct,
  )[0];
  const leaderRead = data.assessment.nomination.candidates.find(
    (row) => row.candidate_id === leader.id,
  )!;
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary">
          Administration &amp; 2028
        </Typography>
        <Typography component="h1" variant="h3">
          Current assessment
        </Typography>
        <AssessmentMeta />
      </Box>
      <Box
        sx={{
          display: { xs: "block", lg: "none" },
          borderLeft: "3px solid",
          borderColor: "primary.main",
          pl: 2,
        }}
      >
        <Typography variant="overline">2028 nomination</Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 650 }}>
          {data.assessment.nomination.headline}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {leaderRead.advantage} {leaderRead.vulnerability}
        </Typography>
        <Button component={RouterLink} to="/nominees" size="small">
          Compare all five
        </Button>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1.15fr 1fr" },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Section
          title="Administration power"
          description={data.assessment.administration.headline}
        >
          <Typography variant="body2" sx={{ maxWidth: "72ch" }}>
            {data.assessment.administration.summary}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Selected consequential contests; other issues retain their review
            limitations.
          </Typography>
          <PowerList
            compact
            contests={data.assessment.administration.contests.slice(0, 3)}
          />
          <Button
            component={RouterLink}
            to="/administration"
            variant="outlined"
          >
            Explore power &amp; decisions
          </Button>
        </Section>
        <Section
          title="2028 Republican nomination"
          description={data.assessment.nomination.headline}
        >
          <CandidateList compact />
          <Button component={RouterLink} to="/nominees" variant="outlined">
            Compare paths &amp; vulnerabilities
          </Button>
        </Section>
      </Box>
      <Section title="Where power and the race intersect">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 3,
          }}
        >
          {data.assessment.cross_implications.map((item) => (
            <Box key={item.id}>
              <Typography variant="subtitle1" sx={{ fontWeight: 650, mb: 1 }}>
                {item.title}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ maxWidth: "65ch" }}
              >
                {item.assessment}
              </Typography>
              <Button
                size="small"
                onClick={() =>
                  evidence({
                    title: item.title,
                    summary: item.assessment,
                    event_ids: item.event_ids,
                  })
                }
              >
                View supporting episodes
              </Button>
            </Box>
          ))}
        </Box>
      </Section>
      <Section title="What could change the assessment">
        <Stack spacing={1.5} divider={<Divider />}>
          {data.assessment.administration.contests
            .slice(0, 3)
            .map((contest) => (
              <Box key={contest.id}>
                <Typography variant="body2">
                  <Box component="span" sx={{ fontWeight: 650 }}>
                    {contest.title}:{" "}
                  </Box>
                  {contest.watch}
                </Typography>
              </Box>
            ))}
        </Stack>
      </Section>
      <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
        <Button component={RouterLink} to="/research">
          Evidence, sources &amp; daily briefings
        </Button>
        <Button component={RouterLink} to="/research?section=methods">
          Methods &amp; limitations
        </Button>
      </Stack>
    </Stack>
  );
}
