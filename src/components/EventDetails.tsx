import { Alert, Box, Chip, Stack, Typography } from "@mui/material";
import type { EventRecord } from "../lib/types";
import { factionNames } from "../lib/data";
import { DetailFields } from "./DetailFields";
import { EntityChips } from "./EntityChips";
import { ResearchText } from "./ResearchText";
export function EventDetails({ event }: { event: EventRecord }) {
  return (
    <Stack spacing={2}>
      <EntityChips issues={event.issues} factions={event.by} />
      <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
        <Chip
          label={
            event.date +
            (event.precision === "month" ? " · month precision" : "")
          }
          size="small"
        />
        <Chip label={event.kind} size="small" />
        <Chip label={`Evidence: ${event.tier}`} size="small" />
      </Stack>
      <Typography variant="subtitle1">{event.actor}</Typography>
      <ResearchText text={event.text} />
      <DetailFields
        value={{
          context: event.context,
          source: event.source,
          source_url: event.url,
          rationale: event.rationale,
        }}
      />
      {Object.keys(event.fx ?? {}).length > 0 && (
        <Box>
          <Typography variant="overline">Legacy faction effects</Typography>
          <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
            {Object.entries(event.fx ?? {}).map(([id, effect]) => (
              <Chip
                key={id}
                variant="outlined"
                label={`${factionNames[id] ?? id}: ${effect > 0 ? "+" : "−"}${event.weight}`}
              />
            ))}
          </Stack>
        </Box>
      )}
      {event.fxnote && <Alert severity="info">{event.fxnote}</Alert>}
    </Stack>
  );
}
