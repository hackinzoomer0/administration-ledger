import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Link as RouterLink } from "react-router-dom";
import { data, factionNames, issueNames } from "../lib/data";
import { label } from "../lib/selectors";
import { ResearchText } from "./ResearchText";

const sourceMap = new Map(
  data.nomination.sources.map((source) => [source.id, source]),
);
export function DetailFields({
  value,
  depth = 0,
}: {
  value: unknown;
  depth?: number;
}) {
  if (value == null || value === "") return null;
  if (typeof value === "string") return <ResearchText text={value} />;
  if (typeof value === "number" || typeof value === "boolean")
    return <Typography variant="body2">{String(value)}</Typography>;
  if (Array.isArray(value))
    return (
      <Stack spacing={1.5}>
        {value.map((item, index) => (
          <Box
            key={index}
            sx={{
              pl: depth ? 1.5 : 0,
              borderLeft: depth ? "2px solid #dce4e6" : 0,
            }}
          >
            <DetailFields value={item} depth={depth + 1} />
          </Box>
        ))}
      </Stack>
    );
  return (
    <Stack spacing={1.5}>
      {Object.entries(value as Record<string, unknown>).map(([key, item]) => {
        if (
          item == null ||
          item === "" ||
          (Array.isArray(item) && !item.length)
        )
          return null;
        if (key === "source_ids" && Array.isArray(item))
          return (
            <Stack key={key} direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
              {item.map(String).map((id) => {
                const source = sourceMap.get(id);
                return source ? (
                  <Link
                    key={id}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {source.publisher}: {source.description}
                  </Link>
                ) : (
                  <Chip key={id} label={id} size="small" />
                );
              })}
            </Stack>
          );
        if (key === "event_ids" && Array.isArray(item))
          return (
            <Stack key={key} sx={{ gap: 1 }}>
              {item.map(String).map((id) => (
                <Link
                  key={id}
                  component={RouterLink}
                  to={`/ledger?event=${encodeURIComponent(id)}`}
                >
                  {id}
                </Link>
              ))}
            </Stack>
          );
        if (key === "faction_id" && typeof item === "string")
          return (
            <Link key={key} component={RouterLink} to={`/factions/${item}`}>
              {factionNames[item] ?? item}
            </Link>
          );
        const title = issueNames[key] ?? label(key);
        if (typeof item === "object" && !Array.isArray(item))
          return (
            <Accordion
              key={key}
              defaultExpanded={depth === 0}
              disableGutters
              elevation={0}
              variant="outlined"
              slotProps={{ transition: { unmountOnExit: true } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">{title}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <DetailFields value={item} depth={depth + 1} />
              </AccordionDetails>
            </Accordion>
          );
        return (
          <Box key={key}>
            <Typography variant="overline" color="text.secondary">
              {title}
            </Typography>
            <DetailFields value={item} depth={depth + 1} />
          </Box>
        );
      })}
    </Stack>
  );
}
