import { createTheme } from "@mui/material/styles";
export const theme = createTheme({
  palette: {
    primary: { main: "#245b5b" },
    secondary: { main: "#92582d" },
    background: { default: "#f5f4f0", paper: "#ffffff" },
    text: { primary: "#1c3035", secondary: "#56686c" },
    divider: "#e2e5e0",
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h3: {
      fontFamily: "Georgia, serif",
      fontSize: "clamp(1.85rem, 4vw, 2.3rem)",
      fontWeight: 500,
      letterSpacing: "-0.035em",
      lineHeight: 1.2,
    },
    h6: { fontWeight: 650, fontSize: "1.08rem" },
    subtitle1: { lineHeight: 1.45 },
    overline: { fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em" },
    body2: { lineHeight: 1.65, fontSize: "0.875rem" },
    button: { textTransform: "none", fontWeight: 600, fontSize: "0.8rem" },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 650, backgroundColor: "#f5f6f2" },
        root: { borderColor: "#e7e9e4" },
      },
    },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiChip: {
      styleOverrides: { root: { maxWidth: "100%", fontSize: "0.7rem" } },
    },
  },
});
