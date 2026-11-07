import { Component, lazy, Suspense } from "react";
import type { ErrorInfo, ReactNode } from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Search } from "./components/Search";
const Home = lazy(() => import("./pages/Home"));
const Issues = lazy(() => import("./pages/Issues"));
const Factions = lazy(() => import("./pages/Factions"));
const People = lazy(() => import("./pages/People"));
const Donors = lazy(() => import("./pages/Donors"));
const Ledger = lazy(() => import("./pages/Ledger"));
const Nominees = lazy(() => import("./pages/Nominees"));
const tabs = [
  ["/", "Overview"],
  ["/issues", "Issues"],
  ["/factions", "Factions"],
  ["/nominees", "2028 nominees"],
  ["/people", "People"],
  ["/donors", "Donors"],
  ["/ledger", "Event ledger"],
];
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }
  render() {
    return this.state.failed ? (
      <Alert
        severity="error"
        action={
          <Button onClick={() => window.location.reload()}>Reload</Button>
        }
      >
        This view could not load. Reload to try again.
      </Alert>
    ) : (
      this.props.children
    );
  }
}
export function App() {
  const location = useLocation();
  const selected = "/" + location.pathname.split("/")[1];
  return (
    <>
      <a
        href="#main-content"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <AppBar
        position="static"
        color="transparent"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ gap: 2, flexWrap: "wrap", py: 2 }}>
            <AccountBalanceIcon color="primary" />
            <Box sx={{ flexGrow: 1 }}>
              <Typography
                component={Link}
                to="/"
                sx={{
                  color: "text.primary",
                  textDecoration: "none",
                  fontSize: 18,
                  fontWeight: 750,
                }}
              >
                Administration Ledger
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block" }}
              >
                Decisions. Interests. Shifts in power.
              </Typography>
            </Box>
            <Search />
            <Chip label="Sourced research" variant="outlined" size="small" />
          </Toolbar>
          <Tabs
            value={tabs.some(([path]) => path === selected) ? selected : "/"}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Main navigation"
          >
            {tabs.map(([path, name]) => (
              <Tab
                key={path}
                value={path}
                label={name}
                component={Link}
                to={path}
              />
            ))}
          </Tabs>
        </Container>
      </AppBar>
      <Container
        component="main"
        id="main-content"
        tabIndex={-1}
        maxWidth="xl"
        sx={{ py: { xs: 3, md: 4 }, minHeight: "75vh", outline: "none" }}
      >
        <ErrorBoundary>
          <Suspense
            fallback={
              <Stack sx={{ ...{ py: 8 }, alignItems: "center" }}>
                <CircularProgress aria-label="Loading view" />
              </Stack>
            }
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="/issues/:id?" element={<Issues />} />
              <Route path="/factions/:id?" element={<Factions />} />
              <Route path="/people/:id?" element={<People />} />
              <Route path="/donors/:id?" element={<Donors />} />
              <Route path="/ledger" element={<Ledger />} />
              <Route path="/nominees/:id?" element={<Nominees />} />
              <Route
                path="*"
                element={
                  <Alert severity="info">
                    View not found. <Link to="/">Return to overview</Link>
                  </Alert>
                }
              />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Container>
      <Box
        component="footer"
        sx={{ borderTop: 1, borderColor: "divider", py: 3 }}
      >
        <Container maxWidth="xl">
          <Typography variant="caption" color="text.secondary">
            Evidence and analyst judgment are labeled separately. Legacy faction
            scores are not nomination probabilities. Allegations are not
            findings.
          </Typography>
        </Container>
      </Box>
    </>
  );
}
