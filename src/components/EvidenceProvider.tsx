import { useState } from "react";
import type { ReactNode } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Link as RouterLink } from "react-router-dom";
import { data } from "../lib/data";
import { EvidenceContext } from "../lib/evidence-context";
import type { EvidenceRequest } from "../lib/evidence-context";
import { EventDetails } from "./EventDetails";
import { ResearchText } from "./ResearchText";
export function EvidenceProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<EvidenceRequest>();
  return (
    <EvidenceContext.Provider value={setRequest}>
      {children}
      <Drawer
        onClick={(event) => {
          const link = (event.target as HTMLElement).closest("a");
          if (link?.getAttribute("href")?.startsWith("#/"))
            setRequest(undefined);
        }}
        anchor="right"
        open={!!request}
        onClose={() => setRequest(undefined)}
        slotProps={{
          paper: {
            sx: { width: { xs: "100%", sm: 560 }, p: { xs: 2, sm: 3 } },
            role: "dialog",
            "aria-labelledby": "evidence-title",
          },
        }}
      >
        {request && (
          <Stack spacing={2}>
            <Stack
              direction="row"
              sx={{
                alignItems: "start",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="overline">
                  Basis for the assessment
                </Typography>
                <Typography id="evidence-title" variant="h6">
                  {request.title}
                </Typography>
              </Box>
              <IconButton
                aria-label="Close evidence"
                onClick={() => setRequest(undefined)}
              >
                <CloseIcon />
              </IconButton>
            </Stack>
            <ResearchText text={request.summary} />
            <Divider />
            {request.event_ids
              .map((id) => data.events.find((event) => event.id === id))
              .filter((event) => !!event)
              .map((event) => (
                <Accordion
                  key={event.id}
                  disableGutters
                  elevation={0}
                  variant="outlined"
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {event.date} · {event.tier}
                      </Typography>
                      <Typography variant="subtitle2">{event.text}</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <EventDetails event={event} />
                    <Button
                      component={RouterLink}
                      to={`/ledger?event=${event.id}`}
                      onClick={() => setRequest(undefined)}
                      sx={{ mt: 2 }}
                    >
                      Open full event record
                    </Button>
                  </AccordionDetails>
                </Accordion>
              ))}
            {(request.source_ids ?? [])
              .map((id) =>
                data.nomination.sources.find((source) => source.id === id),
              )
              .filter((source) => !!source)
              .map((source) => (
                <Box key={source.id}>
                  <Link
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {source.publisher} ·{" "}
                    {source.publication_date ?? "Date not specified"}
                  </Link>
                  <Typography variant="body2" color="text.secondary">
                    {source.description}
                  </Typography>
                </Box>
              ))}
            {!request.event_ids.length && !request.source_ids?.length && (
              <Typography variant="body2">
                No linked episode has been established for this claim. Treat it
                as a research gap.
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Reporting, observed action and analyst inference remain distinct.
              A financial relationship alone does not establish influence.
            </Typography>
          </Stack>
        )}
      </Drawer>
    </EvidenceContext.Provider>
  );
}
