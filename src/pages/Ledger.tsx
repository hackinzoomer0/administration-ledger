import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  useMediaQuery,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useSearchParams } from "react-router-dom";
import { data, activeFactions, issueNames } from "../lib/data";
import { emptyFilters, filterEvents } from "../lib/selectors";
import { ContextNav } from "../components/ContextNav";
import { theme } from "../theme";
import { PageHeader } from "../components/PageHeader";
import { EventDetails } from "../components/EventDetails";
import { RecordDialog } from "../components/RecordDialog";

export default function Ledger() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const wide = useMediaQuery(theme.breakpoints.up("md"));
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [issue, setIssue] = useState(params.get("issue") ?? "");
  const [faction, setFaction] = useState(params.get("faction") ?? "");
  const [kind, setKind] = useState("");
  const [tier, setTier] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const rows = filterEvents(data.events, {
    query,
    issue,
    faction,
    kind,
    tier,
    from,
    to,
  });
  const monthly = Object.entries(
    rows
      .filter((row) => row.kind !== "scheduled")
      .reduce<Record<string, number>>((counts, row) => {
        const month = row.date.slice(0, 7);
        counts[month] = (counts[month] ?? 0) + 1;
        return counts;
      }, {}),
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, records]) => ({ month, records }));
  const selected = data.events.find((row) => row.id === params.get("event"));
  const reset = () => {
    setQuery(emptyFilters.query);
    setIssue("");
    setFaction("");
    setKind("");
    setTier("");
    setFrom("");
    setTo("");
    setPage(0);
    setParams({});
  };
  const select =
    (setter: (value: string) => void) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(event.target.value);
      setPage(0);
    };
  return (
    <Stack spacing={3}>
      <ContextNav area="research" />
      <PageHeader
        title="The event ledger"
        description="Search dated decisions and reporting. Open any record to inspect its evidence, context, rationale and legacy faction effects."
      />
      <Button
        onClick={() => setFiltersOpen(!filtersOpen)}
        sx={{ display: { xs: "inline-flex", md: "none" }, alignSelf: "start" }}
        aria-expanded={filtersOpen}
      >
        Search &amp; filter records
      </Button>
      <Collapse in={wide || filtersOpen}>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
                lg: "2fr 1fr 1fr 1fr",
              },
              gap: 2,
            }}
          >
            <TextField
              label="Search events"
              value={query}
              onChange={select(setQuery)}
              size="small"
              type="search"
            />
            <TextField
              select
              label="Issue"
              value={issue}
              onChange={select(setIssue)}
              size="small"
            >
              <MenuItem value="">All issues</MenuItem>
              {data.issues.map((row) => (
                <MenuItem key={row.code} value={row.code}>
                  {row.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Faction"
              value={faction}
              onChange={select(setFaction)}
              size="small"
            >
              <MenuItem value="">All factions</MenuItem>
              {activeFactions.map((row) => (
                <MenuItem key={row.id} value={row.id}>
                  {row.short}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Record type"
              value={kind}
              onChange={select(setKind)}
              size="small"
            >
              <MenuItem value="">All types</MenuItem>
              {[...new Set(data.events.map((row) => row.kind))].map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Evidence tier"
              value={tier}
              onChange={select(setTier)}
              size="small"
            >
              <MenuItem value="">All tiers</MenuItem>
              {[...new Set(data.events.map((row) => row.tier))].map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="From date"
              type="date"
              value={from}
              onChange={select(setFrom)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Through date"
              type="date"
              value={to}
              onChange={select(setTo)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button onClick={reset}>Clear filters</Button>
          </Box>
        </Paper>
      </Collapse>
      <Typography variant="body2" color="text.secondary" role="status">
        {rows.length} of {data.events.length} records
      </Typography>
      {from && to && from > to && (
        <Alert severity="warning">The start date is after the end date.</Alert>
      )}
      <Accordion disableGutters elevation={0} variant="outlined">
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Activity by month</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary">
            Filtered records across the latest 12 covered months. Scheduled
            items are excluded; activity does not measure influence.
          </Typography>
          <Box sx={{ height: 240, minWidth: 0 }}>
            <ResponsiveContainer>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="records" name="Records" fill="#215c63" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </AccordionDetails>
      </Accordion>
      <Paper variant="outlined">
        <TableContainer>
          <Table aria-label="Event records" sx={{ minWidth: 680 }}>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Decision or development</TableCell>
                <TableCell>Issue</TableCell>
                <TableCell>Evidence</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(page * size, page * size + size).map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell
                    sx={{ whiteSpace: "nowrap", verticalAlign: "top" }}
                  >
                    {row.date}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block" }}
                    >
                      {row.precision === "month" ? "Month precision" : row.kind}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button
                      sx={{ textAlign: "left", px: 0, justifyContent: "start" }}
                      onClick={() => {
                        const next = new URLSearchParams(params);
                        next.set("event", row.id);
                        setParams(next);
                      }}
                    >
                      {row.text}
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      {row.actor}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {row.issues.map((code) => (
                      <Chip
                        key={code}
                        label={issueNames[code] ?? code}
                        size="small"
                        sx={{ m: 0.25 }}
                      />
                    ))}
                  </TableCell>
                  <TableCell>
                    <Chip label={row.tier} size="small" variant="outlined" />
                    <Typography variant="caption" sx={{ display: "block" }}>
                      Weight {row.weight}/5 · legacy
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {!rows.length && (
          <Alert severity="info" sx={{ m: 2 }}>
            No records match. Clear a filter to broaden the search.
          </Alert>
        )}
        <TablePagination
          component="div"
          count={rows.length}
          page={Math.min(page, Math.max(0, Math.ceil(rows.length / size) - 1))}
          rowsPerPage={size}
          onPageChange={(_, value) => setPage(value)}
          onRowsPerPageChange={(event) => {
            setSize(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Paper>
      {selected && (
        <RecordDialog
          title="Event evidence"
          onClose={() => {
            const next = new URLSearchParams(params);
            next.delete("event");
            setParams(next);
          }}
        >
          <EventDetails event={selected} />
        </RecordDialog>
      )}
    </Stack>
  );
}
