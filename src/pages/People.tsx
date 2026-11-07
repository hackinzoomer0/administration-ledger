import { Alert, Stack } from "@mui/material";
import { data } from "../lib/data";
import { Directory } from "../components/Directory";
import { DetailFields } from "../components/DetailFields";
import { EntityChips } from "../components/EntityChips";
export default function People() {
  return (
    <Directory
      title="People and their interests"
      description="Roles, policy positions and relationships. Cross-faction placement is an analytical assessment; inspect the underlying evidence."
      path="people"
      rows={data.people}
      subtitle={(row) => row.role}
      factions={(row) => [
        ...(row.home ? [row.home] : []),
        ...(row.also ?? []),
        ...(row.rosters ?? []).map((item) => item.f),
      ]}
      badges={(row) => (
        <EntityChips
          factions={row.home ? [row.home] : []}
          issues={Object.keys(row.positions ?? {}).slice(0, 3)}
        />
      )}
      details={(row) => (
        <Stack spacing={2}>
          <EntityChips
            factions={[...(row.home ? [row.home] : []), ...(row.also ?? [])]}
          />
          <Alert severity="info">
            Motive interpretations and legacy alignment ratings are judgments,
            not proof of intent.
          </Alert>
          <DetailFields value={row} />
          <DetailFields
            value={{
              linked_donors: data.donors.filter((donor) =>
                donor.people.includes(row.id),
              ),
              legal_exposure: (
                data.meta.legal as { entries?: { subjects?: string[] }[] }
              ).entries?.filter((entry) => entry.subjects?.includes(row.id)),
            }}
          />
        </Stack>
      )}
    />
  );
}
