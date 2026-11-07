import { Link, Typography } from "@mui/material";
import { safeUrl } from "../lib/selectors";

/** Research stays plain text. Only HTTP(S) links are made interactive. */
export function ResearchText({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <Typography
      component="div"
      variant="body2"
      sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
    >
      {text.split(/(https?:\/\/[^\s<>]+)/g).map((part, index) => {
        const url = safeUrl(part);
        return url ? (
          <Link
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {part}
          </Link>
        ) : (
          part
        );
      })}
    </Typography>
  );
}
