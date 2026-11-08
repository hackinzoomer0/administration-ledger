import type { Json } from "./types";
const files = import.meta.glob(
  "../../database/{runs,report,nominations}/*.json",
  { import: "default" },
);
export async function loadArchive(
  collection: "runs" | "report" | "nominations",
) {
  const rows = await Promise.all(
    Object.entries(files)
      .filter(([path]) => path.includes(`/database/${collection}/`))
      .map(async ([path, read]) => [
        path
          .split("/")
          .at(-1)!
          .replace(/\.json$/, ""),
        await read(),
      ]),
  );
  return Object.fromEntries(rows) as Record<string, Json>;
}
