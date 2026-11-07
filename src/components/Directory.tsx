import { useState } from "react";
import type { ReactNode } from "react";
import {
  Alert,
  Button,
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
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import {
  Link as RouterLink,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { activeFactions } from "../lib/data";
import { PageHeader } from "./PageHeader";

interface Entry {
  id: string;
  name: string;
}
export function Directory<T extends Entry>({
  title,
  description,
  path,
  rows,
  subtitle,
  factions,
  badges,
  details,
}: {
  title: string;
  description: string;
  path: string;
  rows: T[];
  subtitle: (row: T) => string;
  factions: (row: T) => string[];
  badges: (row: T) => ReactNode;
  details: (row: T) => ReactNode;
}) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const [faction, setFaction] = useState(params.get("faction") ?? "");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [ascending, setAscending] = useState(true);
  const filtered = rows
    .filter(
      (row) =>
        (!faction || factions(row).includes(faction)) &&
        `${row.name} ${subtitle(row)}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => (ascending ? 1 : -1) * a.name.localeCompare(b.name));
  const selected = rows.find((row) => row.id === id);
  if (selected)
    return (
      <Stack spacing={3}>
        <Button
          component={RouterLink}
          to={`/${path}`}
          sx={{ alignSelf: "start" }}
        >
          ← {title}
        </Button>
        <PageHeader title={selected.name} description={subtitle(selected)} />
        {details(selected)}
      </Stack>
    );
  return (
    <Stack spacing={3}>
      <PageHeader title={title} description={description} />
      <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 2 }}>
        <TextField
          label={`Search ${path}`}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
          size="small"
          type="search"
          sx={{ flex: 1 }}
        />
        <TextField
          select
          label="Faction"
          value={faction}
          onChange={(event) => {
            setFaction(event.target.value);
            setPage(0);
          }}
          size="small"
          sx={{ minWidth: 220 }}
        >
          <MenuItem value="">All factions</MenuItem>
          {activeFactions.map((row) => (
            <MenuItem key={row.id} value={row.id}>
              {row.short}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <Typography variant="body2" role="status">
        {filtered.length} of {rows.length} records
      </Typography>
      <Paper variant="outlined">
        <TableContainer>
          <Table aria-label={`${title} directory`} sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow>
                <TableCell sortDirection={ascending ? "asc" : "desc"}>
                  <TableSortLabel
                    active
                    direction={ascending ? "asc" : "desc"}
                    onClick={() => {
                      setAscending(!ascending);
                      setPage(0);
                    }}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell>Role or relationship</TableCell>
                <TableCell>Connections</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.slice(page * size, page * size + size).map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Button
                      component={RouterLink}
                      to={`/${path}/${row.id}`}
                      sx={{ textAlign: "left" }}
                    >
                      {row.name}
                    </Button>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 420 }}>
                    <Typography variant="body2">{subtitle(row)}</Typography>
                  </TableCell>
                  <TableCell>{badges(row)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {!filtered.length && (
          <Alert severity="info">
            No matching records. Try another search or faction.
          </Alert>
        )}
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          rowsPerPage={size}
          onPageChange={(_, value) => setPage(value)}
          onRowsPerPageChange={(event) => {
            setSize(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>
      {id && !selected && <Alert severity="warning">Record not found.</Alert>}
    </Stack>
  );
}
