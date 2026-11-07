import { createTheme } from "@mui/material/styles";
export const theme = createTheme({
  palette: {
    primary: { main: "#215c63" },
    secondary: { main: "#b86535" },
    background: { default: "#f3f5f5", paper: "#ffffff" },
    text: { primary: "#172d35", secondary: "#536871" },
    divider: "#dce4e6",
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h3: {
      fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
      fontWeight: 700,
      letterSpacing: "-0.04em",
    },
    h6: { fontWeight: 650, fontSize: "1.1rem" },
    overline: { fontSize: "0.67rem", fontWeight: 700, letterSpacing: "0.1em" },
    body2: { lineHeight: 1.75 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 650, backgroundColor: "#f5f8f8" },
        root: { borderColor: "#e5ebed" },
      },
    },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiChip: { styleOverrides: { root: { maxWidth: "100%" } } },
  },
});
