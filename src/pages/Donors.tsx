import { Alert, Stack } from "@mui/material";
import { data } from "../lib/data";
import { Directory } from "../components/Directory";
import { DetailFields } from "../components/DetailFields";
import { EntityChips } from "../components/EntityChips";
export default function Donors() {
  return (
    <Directory
      title="Donors, payers and access"
      description="Follow financial relationships into people and factions. Historical gifts, business investments, paid representation and prospective backing remain distinct."
      path="donors"
      rows={data.donors}
      subtitle={(row) => row.identity || row.amounts?.[0] || ""}
      factions={(row) => row.factions ?? []}
      badges={(row) => <EntityChips factions={row.factions?.slice(0, 3)} />}
      details={(row) => (
        <Stack spacing={2}>
          <Alert severity="info">
            A documented payment or investment does not by itself establish
            influence over an official decision.
          </Alert>
          <EntityChips
            factions={row.factions}
            issues={row.supports ?? row.issues}
          />
          <DetailFields value={row} />
        </Stack>
      )}
    />
  );
}
