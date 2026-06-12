import { useRef, useState, useEffect, useCallback } from "react";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import SideMenu from "./SideMenu.jsx";
import { useMenu } from "../MenuContext.jsx";

export default function Navbar({ isSignedIn, NoNavBarLimit }) {
  const { setMenuOpen } = useMenu();
  const navigate = useNavigate();
  const [showNavbar, setShowNavbar] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const lastScrollY = useRef(0);

  const showNavBar = useCallback(() => {
    const currentScrollY = window.scrollY;
    const shouldReactToScroll = currentScrollY > window.innerHeight || NoNavBarLimit;

    if (!shouldReactToScroll) {
      setShowNavbar(true);
      lastScrollY.current = currentScrollY;
      return;
    }

    if (currentScrollY - lastScrollY.current > 7) {
      setShowNavbar(false);
    } else if (currentScrollY - lastScrollY.current < -7) {
      setShowNavbar(true);
    }

    lastScrollY.current = currentScrollY;
  }, [NoNavBarLimit]);

  useEffect(() => {
    window.addEventListener("scroll", showNavBar, { passive: true });
    return () => {
      window.removeEventListener("scroll", showNavBar);
    };
  }, [showNavBar]);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchInput.trim();
    if (!query) return;

    navigate(`/search?q=${encodeURIComponent(query)}`);
    setSearchInput("");
  };

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip To Content
      </a>

      <AppBar
        position="fixed"
        color="transparent"
        elevation={0}
        sx={(theme) => ({
          px: { xs: 1.5, sm: 2.5, lg: "5vw" },
          pt: 1.5,
          transform: showNavbar ? "translateY(0)" : "translateY(-120%)",
          transition: theme.transitions.create("transform", { duration: 260 }),
          pointerEvents: showNavbar ? "auto" : "none",
        })}
      >
        <Toolbar
          component="nav"
          disableGutters
          sx={(theme) => ({
            mx: "auto",
            width: "100%",
            maxWidth: 1280,
            minHeight: "64px !important",
            gap: { xs: 1, sm: 1.5 },
            border: `1px solid ${alpha(theme.palette.common.white, 0.14)}`,
            borderRadius: 4,
            bgcolor: alpha(theme.palette.primary.dark, theme.palette.mode === "dark" ? 0.9 : 0.88),
            color: "common.white",
            px: { xs: 1.25, sm: 1.75 },
            py: 1,
            boxShadow: "0 18px 60px rgba(17,24,39,0.22)",
            backdropFilter: "blur(18px)",
          })}
        >
          <IconButton
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Open Menu"
            sx={{
              width: 44,
              height: 44,
              borderRadius: 3,
              color: "common.white",
              border: "1px solid rgba(255,255,255,0.12)",
              bgcolor: "rgba(255,255,255,0.06)",
              "&:hover": { bgcolor: "rgba(217,58,47,0.18)", borderColor: "rgba(255,255,255,0.3)" },
            }}
          >
            <MenuRoundedIcon />
          </IconButton>

          <Stack
            component={RouterLink}
            to="/home"
            direction="row"
            alignItems="center"
            spacing={1}
            aria-label="3Dprintings.xyz Home"
            translate="no"
            sx={{ color: "inherit", textDecoration: "none", minWidth: 0, flexShrink: 0 }}
          >
            <Avatar
              variant="rounded"
              sx={{
                width: 42,
                height: 42,
                borderRadius: 3,
                bgcolor: "secondary.main",
                color: "common.white",
                fontWeight: 900,
                boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
              }}
            >
              3D
            </Avatar>
            <Box sx={{ display: { xs: "none", sm: "block" }, lineHeight: 1 }}>
              <Typography component="span" display="block" fontWeight={900} letterSpacing="-0.02em">
                3Dprintings
              </Typography>
              <Typography component="span" display="block" fontSize={11} fontWeight={800} letterSpacing="0.22em" color="secondary.light">
                MODELS
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={0.5} sx={{ display: { xs: "none", lg: "flex" } }}>
            <Button component={RouterLink} to="/products" color="inherit" sx={{ borderRadius: 999, px: 2 }}>
              Browse
            </Button>
            <Button component={RouterLink} to="/become-seller" color="inherit" sx={{ borderRadius: 999, px: 2 }}>
              Sell
            </Button>
          </Stack>

          <Box component="form" role="search" onSubmit={handleSearch} sx={{ minWidth: 0, flex: 1 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                borderRadius: 3,
                border: "1px solid rgba(255,255,255,0.12)",
                bgcolor: "rgba(255,255,255,0.11)",
                px: 1,
                transition: "background-color 160ms ease, border-color 160ms ease",
                "&:focus-within": {
                  bgcolor: "rgba(255,255,255,0.17)",
                  borderColor: "rgba(255,255,255,0.34)",
                },
              }}
            >
              <InputBase
                id="site-search"
                name="q"
                type="search"
                inputMode="search"
                autoComplete="off"
                spellCheck={false}
                placeholder="Search models, parts, STL files..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                sx={{
                  flex: 1,
                  color: "common.white",
                  fontSize: 14,
                  fontWeight: 700,
                  px: { xs: 1, sm: 1.5 },
                  py: 0.75,
                  "& input::placeholder": { color: "rgba(255,255,255,0.58)", opacity: 1 },
                }}
                inputProps={{ "aria-label": "Search 3D printed products and files" }}
              />
              <IconButton
                type="submit"
                aria-label="Search"
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2.5,
                  bgcolor: "common.white",
                  color: "grey.950",
                  "&:hover": { bgcolor: "secondary.light" },
                }}
              >
                <SearchRoundedIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            {isSignedIn ? (
              <IconButton
                component={RouterLink}
                to="/account"
                aria-label="Account"
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  width: 44,
                  height: 44,
                  borderRadius: 3,
                  color: "common.white",
                  border: "1px solid rgba(255,255,255,0.12)",
                  bgcolor: "rgba(255,255,255,0.06)",
                  "&:hover": { bgcolor: "rgba(217,58,47,0.18)", borderColor: "rgba(255,255,255,0.3)" },
                }}
              >
                <AccountCircleOutlinedIcon />
              </IconButton>
            ) : (
              <Button
                component={RouterLink}
                to="/signup"
                variant="contained"
                color="inherit"
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  bgcolor: "common.white",
                  color: "grey.950",
                  borderRadius: 3,
                  px: 2,
                  "&:hover": { bgcolor: "secondary.light" },
                }}
              >
                Sign up
              </Button>
            )}

            <IconButton
              component={RouterLink}
              to="/cart"
              aria-label="Cart"
              sx={{
                width: 44,
                height: 44,
                borderRadius: 3,
                color: "common.white",
                border: "1px solid rgba(255,255,255,0.12)",
                bgcolor: "rgba(255,255,255,0.06)",
                "&:hover": { bgcolor: "rgba(217,58,47,0.18)", borderColor: "rgba(255,255,255,0.3)" },
              }}
            >
              <ShoppingCartOutlinedIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <SideMenu />
    </>
  );
}
