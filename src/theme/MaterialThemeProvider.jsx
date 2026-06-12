import { useMemo } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import { ThemeProvider as MuiThemeProvider, createTheme, alpha } from "@mui/material/styles";
import { useTheme as useAppTheme } from "../ThemeContext.jsx";

const globalStyles = (
  <GlobalStyles
    styles={(theme) => ({
      ":root": {
        "--mui-brand-ink": theme.palette.primary.dark,
        "--mui-brand-orange": theme.palette.secondary.main,
        "--mui-surface": theme.palette.background.paper,
      },
      html: {
        backgroundColor: theme.palette.background.default,
      },
      body: {
        backgroundColor: theme.palette.background.default,
        color: theme.palette.text.primary,
      },
      ".MuiButtonBase-root": {
        touchAction: "manipulation",
      },
      ".skip-link": {
        position: "fixed",
        left: 16,
        top: 12,
        zIndex: theme.zIndex.tooltip + 1,
        transform: "translateY(-5rem)",
        borderRadius: 999,
        backgroundColor: theme.palette.grey[950] || "#111827",
        color: theme.palette.common.white,
        padding: "0.75rem 1.25rem",
        fontSize: "0.875rem",
        fontWeight: 800,
        boxShadow: theme.shadows[8],
        transition: theme.transitions.create("transform", { duration: 180 }),
      },
      ".skip-link:focus": {
        transform: "translateY(0)",
        outline: `4px solid ${alpha(theme.palette.secondary.main, 0.35)}`,
      },
    })}
  />
);

function buildMaterialTheme(mode) {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? "#2dd4bf" : "#064e3b",
        light: isDark ? "#5eead4" : "#0f766e",
        dark: isDark ? "#0f766e" : "#052e22",
        contrastText: "#ffffff",
      },
      secondary: {
        main: "#d93a2f",
        light: "#fb7185",
        dark: "#9f201c",
        contrastText: "#ffffff",
      },
      background: {
        default: isDark ? "#09090b" : "#e7f3df",
        paper: isDark ? "#18181b" : "#ffffff",
      },
      text: {
        primary: isDark ? "#fafafa" : "#111827",
        secondary: isDark ? "#d4d4d8" : "#4b5563",
      },
      divider: isDark ? alpha("#ffffff", 0.12) : alpha("#052e22", 0.12),
    },
    shape: {
      borderRadius: 18,
    },
    typography: {
      fontFamily: '"Ubuntu", ui-sans-serif, system-ui, sans-serif',
      h1: { fontWeight: 900, letterSpacing: "-0.04em" },
      h2: { fontWeight: 900, letterSpacing: "-0.035em" },
      h3: { fontWeight: 850, letterSpacing: "-0.03em" },
      h4: { fontWeight: 850, letterSpacing: "-0.025em" },
      h5: { fontWeight: 800, letterSpacing: "-0.02em" },
      h6: { fontWeight: 800, letterSpacing: "-0.015em" },
      button: { fontWeight: 800, textTransform: "none" },
    },
    components: {
      MuiCssBaseline: {
        defaultProps: {
          enableColorScheme: true,
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 16,
            minHeight: 42,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 28,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: isDark ? "0 18px 50px rgba(0,0,0,0.38)" : "0 18px 50px rgba(6,78,59,0.12)",
          }),
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 800,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: ({ theme }) => ({
            backgroundImage: `radial-gradient(circle at top right, ${alpha(theme.palette.secondary.main, 0.18)}, transparent 17rem)`,
          }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 16,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: {
            borderRadius: 24,
          },
        },
      },
    },
  });
}

export default function MaterialThemeProvider({ children }) {
  const { theme } = useAppTheme();
  const materialTheme = useMemo(() => buildMaterialTheme(theme), [theme]);

  return (
    <MuiThemeProvider theme={materialTheme}>
      <CssBaseline />
      {globalStyles}
      {children}
    </MuiThemeProvider>
  );
}
