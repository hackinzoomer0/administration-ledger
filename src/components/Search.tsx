import { Autocomplete, TextField, Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { data } from "../lib/data";
const options = [
  ...data.factions.map((row) => ({
    name: row.name,
    kind: "Faction",
    url: `/factions/${row.id}`,
  })),
  ...data.issues.map((row) => ({
    name: row.name,
    kind: "Issue",
    url: `/issues/${row.code}`,
  })),
  ...data.people.map((row) => ({
    name: row.name,
    kind: "Person",
    url: `/people/${row.id}`,
  })),
  ...data.donors.map((row) => ({
    name: row.name,
    kind: "Donor",
    url: `/donors/${row.id}`,
  })),
  ...data.nomination.candidates.map((row) => ({
    name: row.name,
    kind: "Nominee",
    url: `/nominees/${row.id}`,
  })),
];
export function Search({ onSelect }: { onSelect?: () => void }) {
  const navigate = useNavigate();
  return (
    <Autocomplete
      sx={{ width: { xs: "100%", sm: 280 } }}
      options={options}
      getOptionLabel={(option) => option.name}
      value={null}
      clearOnBlur
      blurOnSelect
      onChange={(_, option) => {
        if (option) {
          navigate(option.url);
          onSelect?.();
        }
      }}
      renderOption={(props, option) => {
        const { key, ...rest } = props;
        return (
          <Box
            key={`${key}-${option.kind}`}
            component="li"
            {...rest}
            sx={{ gap: 1 }}
          >
            <Typography variant="caption" color="text.secondary">
              {option.kind}
            </Typography>
            {option.name}
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label="Find a person, faction or issue"
        />
      )}
    />
  );
}
