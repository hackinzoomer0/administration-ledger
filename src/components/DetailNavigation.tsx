import { MenuItem, Tab, Tabs, TextField } from "@mui/material";
export function DetailNavigation({
  value,
  onChange,
  items,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  items: [string, string][];
  label: string;
}) {
  return (
    <>
      <Tabs
        value={value}
        onChange={(_, next: string) => onChange(next)}
        aria-label={label}
        sx={{ display: { xs: "none", md: "flex" } }}
      >
        {items.map(([key, text]) => (
          <Tab key={key} value={key} label={text} />
        ))}
      </Tabs>
      <TextField
        select
        fullWidth
        label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        size="small"
        sx={{ display: { xs: "block", md: "none" } }}
      >
        {items.map(([key, text]) => (
          <MenuItem key={key} value={key}>
            {text}
          </MenuItem>
        ))}
      </TextField>
    </>
  );
}
