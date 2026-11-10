import { Component, lazy, Suspense, useState, useLayoutEffect } from "react";
import type { ErrorInfo, ReactNode } from "react";
import {
  Alert,
  AppBar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import HowToVoteOutlinedIcon from "@mui/icons-material/HowToVoteOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Search } from "./components/Search";
import { EvidenceProvider } from "./components/EvidenceProvider";
const Home = lazy(() => import("./pages/Home"));
const Administration = lazy(() => import("./pages/Administration"));
const Personnel = lazy(() => import("./pages/Personnel"));
const Research = lazy(() => import("./pages/Research"));
const Issues = lazy(() => import("./pages/Issues"));
const Factions = lazy(() => import("./pages/Factions"));
const People = lazy(() => import("./pages/People"));
const Donors = lazy(() => import("./pages/Donors"));
const Ledger = lazy(() => import("./pages/Ledger"));
const Nominees = lazy(() => import("./pages/Nominees"));
const destinations = [
  {
    path: "/",
    label: "Current assessment",
    short: "Overview",
    icon: <DashboardOutlinedIcon />,
  },
  {
    path: "/administration",
    label: "Administration",
    short: "Power",
    icon: <HubOutlinedIcon />,
  },
  {
    path: "/nominees",
    label: "2028 nomination",
    short: "2028",
    icon: <HowToVoteOutlinedIcon />,
  },
  {
    path: "/research",
    label: "Research",
    short: "Research",
    icon: <MenuBookOutlinedIcon />,
  },
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
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const [searchOpen, setSearchOpen] = useState(false);
  const segment = location.pathname.split("/")[1];
  const selected = ["administration", "issues", "factions", "people"].includes(
    segment,
  )
    ? "/administration"
    : segment === "nominees"
      ? "/nominees"
      : ["research", "ledger", "donors"].includes(segment)
        ? "/research"
        : "/";
  return (
    <EvidenceProvider>
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
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Container maxWidth="xl">
          <Toolbar
            disableGutters
            sx={{ gap: 2, minHeight: { xs: 56, md: 68 } }}
          >
            <AccountBalanceIcon color="primary" sx={{ fontSize: 23 }} />
            <Typography
              component={Link}
              to="/"
              sx={{
                color: "text.primary",
                textDecoration: "none",
                fontWeight: 750,
                fontSize: { xs: 15, md: 17 },
                whiteSpace: "nowrap",
                mr: { xs: "auto", md: 3 },
              }}
            >
              Administration Ledger
            </Typography>
            <Box
              component="nav"
              aria-label="Primary navigation"
              sx={{ display: { xs: "none", md: "flex" }, gap: 0.5, flex: 1 }}
            >
              {destinations.map((item) => (
                <Button
                  component={Link}
                  key={item.path}
                  to={item.path}
                  color={selected === item.path ? "primary" : "inherit"}
                  aria-current={selected === item.path ? "page" : undefined}
                  sx={{
                    bgcolor:
                      selected === item.path ? "action.selected" : undefined,
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
            <Box sx={{ display: { xs: "none", md: "block" } }}>
              <Search />
            </Box>
            <IconButton
              aria-label="Search people, factions and issues"
              onClick={() => setSearchOpen(true)}
              sx={{ display: { xs: "inline-flex", md: "none" } }}
            >
              <SearchIcon />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>
      <Dialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Find an actor or issue
          <IconButton
            aria-label="Close search"
            onClick={() => setSearchOpen(false)}
            sx={{ float: "right" }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Search onSelect={() => setSearchOpen(false)} />
        </DialogContent>
      </Dialog>
      <Container
        component="main"
        id="main-content"
        tabIndex={-1}
        maxWidth="xl"
        sx={{ py: { xs: 2.5, md: 4 }, minHeight: "78vh", outline: "none" }}
      >
        <ErrorBoundary>
          <Suspense
            fallback={
              <Stack sx={{ alignItems: "center", py: 8 }}>
                <CircularProgress aria-label="Loading view" />
              </Stack>
            }
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="/administration/:id?" element={<Administration />} />
              <Route
                path="/administration/personnel/:caseId?"
                element={<Personnel />}
              />
              <Route path="/research" element={<Research />} />
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
                    View not found.{" "}
                    <Link to="/">Return to current assessment</Link>
                  </Alert>
                }
              />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Container>
      <Box
        component="footer"
        sx={{
          borderTop: 1,
          borderColor: "divider",
          pt: 2,
          pb: { xs: 11, md: 3 },
        }}
      >
        <Container maxWidth="xl">
          <Typography variant="caption" color="text.secondary">
            Authority, access and analyst judgment are distinguished. Nomination
            estimates are conditional on the tracked field; impeachment
            forecasts use their stated deadline.{" "}
            <Link to="/research?section=methods">Methods &amp; limits</Link>
          </Typography>
        </Container>
      </Box>
      <BottomNavigation
        value={selected}
        showLabels
        aria-label="Mobile navigation"
        sx={{
          display: { xs: "flex", md: "none" },
          position: "fixed",
          bottom: 0,
          width: "100%",
          zIndex: 1100,
          height: "calc(60px + env(safe-area-inset-bottom))",
          pb: "env(safe-area-inset-bottom)",
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        {destinations.map((item) => (
          <BottomNavigationAction
            key={item.path}
            component={Link}
            to={item.path}
            value={item.path}
            icon={item.icon}
            sx={{
              minWidth: 0,
              "& .MuiBottomNavigationAction-label": {
                whiteSpace: "nowrap",
                fontSize: "0.7rem",
              },
            }}
            label={item.short}
            aria-label={item.label}
          />
        ))}
      </BottomNavigation>
    </EvidenceProvider>
  );
}
