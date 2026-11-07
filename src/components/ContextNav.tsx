import { Button, Stack } from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";
export function ContextNav({ area }: { area: "research" | "administration" }) {
  const location = useLocation();
  const links =
    area === "research"
      ? [
          ["/research", "Research overview"],
          ["/ledger", "Event ledger"],
          ["/people", "People"],
          ["/donors", "Money & access"],
        ]
      : [
          ["/administration", "Power assessment"],
          ["/issues", "Issues"],
          ["/factions", "Factions"],
        ];
  return (
    <Stack
      component="nav"
      aria-label={`${area} sections`}
      direction="row"
      sx={{ flexWrap: "wrap", gap: 0.5, mb: 1 }}
    >
      {links.map(([path, label]) => (
        <Button
          key={path}
          component={RouterLink}
          to={path}
          size="small"
          variant={location.pathname === path ? "outlined" : "text"}
        >
          {label}
        </Button>
      ))}
    </Stack>
  );
}
