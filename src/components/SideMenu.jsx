import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import { Link as RouterLink } from "react-router-dom";
import { useMenu } from "../MenuContext.jsx";
import { useAuth } from "../AuthContext.jsx";
import { useTheme } from "../ThemeContext.jsx";
import { MARKETPLACE_HOME_URL, SELLER_SITE_ORIGIN } from "../config/api.js";

function buildCustomerMenuItems(isSeller) {
  const items = [
    { label: "Home", to: "/home" },
    { label: "Shop 3D Prints", to: "/products" },
    { label: "Liked Products", to: "/liked-products" },
    { label: "Saved Products", to: "/saved-products" },
    { label: "Orders", to: "/account/orders" },
    { label: "Messages", to: "/messages" },
    { label: "Your Reviews", to: "/your-reviews" },
  ];

  if (isSeller) {
    items.push({
      label: "Seller Dashboard",
      to: `${SELLER_SITE_ORIGIN}/dashboard`,
      external: true,
    });
  } else {
    items.push({ label: "Become a Seller", to: "/become-seller" });
  }

  items.push({ label: "Terms", to: "/terms" });
  items.push({ label: "Privacy", to: "/privacy" });

  return items;
}

const seller = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Balance", to: "/balance" },
  { label: "Inventory", to: "/inventory" },
  { label: "Shipping Boxes", to: "/boxes" },
  { label: "Orders", to: "/orders" },
  { label: "Messages", to: "/messages" },
  { label: "Reviews", to: "/reviews" },
  { label: "Preferences", to: "/preferences" },
  { label: "Back To Marketplace", to: MARKETPLACE_HOME_URL, external: true },
];

const SideMenu = ({ title = "Menu", role = "customer", items }) => {
  const { menuOpen, setMenuOpen } = useMenu();
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const isSeller = String(user?.role || "").trim().toLowerCase() === "seller";
  const activeItems = Array.isArray(items) ? items : role === "seller" ? seller : buildCustomerMenuItems(isSeller);
  const menuDescription = role === "seller"
    ? "Manage listings, orders, messages, and seller settings."
    : "Find prints, manage orders, or start selling from one place.";

  const closeMenu = () => setMenuOpen(false);

  return (
    <Drawer
      anchor="left"
      open={menuOpen}
      onClose={closeMenu}
      ModalProps={{ keepMounted: true }}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: "rgba(3,7,18,0.18)",
            backdropFilter: "blur(5px)",
          },
        },
        paper: {
          sx: (theme) => ({
            width: "min(21.5rem, 88vw)",
            borderRight: `1px solid ${alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.16 : 0.42)}`,
            bgcolor: alpha(theme.palette.mode === "dark" ? "#09090b" : "#fffaf2", theme.palette.mode === "dark" ? 0.52 : 0.38),
            color: "text.primary",
            overflow: "hidden",
            backgroundImage: [
              `radial-gradient(circle at 18% 8%, ${alpha(theme.palette.secondary.main, 0.2)}, transparent 16rem)`,
              `radial-gradient(circle at 95% 22%, ${alpha(theme.palette.primary.light, theme.palette.mode === "dark" ? 0.2 : 0.24)}, transparent 14rem)`,
              `linear-gradient(145deg, ${alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.08 : 0.32)}, ${alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.1 : 0.18)})`,
            ].join(", "),
            backdropFilter: "blur(28px) saturate(150%)",
            WebkitBackdropFilter: "blur(28px) saturate(150%)",
            boxShadow: theme.palette.mode === "dark"
              ? "28px 0 80px rgba(0,0,0,0.5)"
              : "28px 0 80px rgba(6,78,59,0.18)",
          }),
        },
      }}
    >
      <Stack sx={{ height: "100%" }}>
        <Box
          sx={(theme) => ({
            position: "relative",
            overflow: "hidden",
            p: 2.5,
            borderBottom: `1px solid ${alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.12 : 0.34)}`,
            backgroundImage: `linear-gradient(${alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.07 : 0.22)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.07 : 0.22)} 1px, transparent 1px)`,
            backgroundSize: "44px 44px",
          })}
        >
          <Stack
            direction="row"
            spacing={2}
            sx={{ position: "relative", alignItems: "flex-start", justifyContent: "space-between" }}
          >
            <Stack spacing={1.25}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                <Avatar
                  variant="rounded"
                  sx={(theme) => ({
                    bgcolor: alpha(theme.palette.secondary.main, 0.92),
                    borderRadius: 3,
                    boxShadow: `0 14px 34px ${alpha(theme.palette.secondary.main, 0.28)}`,
                  })}
                >
                  <StorefrontRoundedIcon />
                </Avatar>
                <Box>
                  <Typography fontSize={12} fontWeight={900} letterSpacing="0.24em" color="secondary.main">
                    3DPRINTINGS
                  </Typography>
                  <Typography variant="h5" component="h2">
                    {title}
                  </Typography>
                </Box>
              </Stack>
              <Typography color="text.secondary" fontSize={14} fontWeight={650} sx={{ lineHeight: 1.65 }}>
                {menuDescription}
              </Typography>
            </Stack>
            <IconButton
              onClick={closeMenu}
              aria-label="Close Menu"
              sx={(theme) => ({
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.12 : 0.34)}`,
                bgcolor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.06 : 0.28),
                "&:hover": {
                  bgcolor: alpha(theme.palette.secondary.main, 0.14),
                  color: "secondary.main",
                },
              })}
            >
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </Box>

        <List sx={{ flex: 1, minHeight: 0, overflowY: "auto", p: 1.5 }}>
          {activeItems.map((item) => (
            <ListItemButton
              key={`${item.to}-${item.label}`}
              component={item.external ? "a" : RouterLink}
              href={item.external ? item.to : undefined}
              to={item.external ? undefined : item.to}
              onClick={closeMenu}
              sx={(theme) => ({
                borderRadius: 3,
                mb: 0.5,
                px: 2,
                py: 1.25,
                border: `1px solid ${alpha(theme.palette.common.white, 0)}`,
                transition: "transform 160ms ease, background-color 160ms ease, border-color 160ms ease, color 160ms ease",
                "&:hover": {
                  transform: "translateX(4px)",
                  bgcolor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.08 : 0.38),
                  borderColor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.1 : 0.42),
                  color: "secondary.main",
                },
              })}
            >
              <ListItemText
                primary={item.label}
                slotProps={{ primary: { fontSize: 14, fontWeight: 850 } }}
              />
            </ListItemButton>
          ))}
        </List>

        <Divider sx={(theme) => ({ borderColor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.12 : 0.32) })} />

        <Box sx={{ p: 2 }}>
          <Stack
            spacing={1.25}
            sx={(theme) => ({
              border: `1px solid ${alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.14 : 0.4)}`,
              borderRadius: 4,
              p: 1.5,
              bgcolor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.06 : 0.3),
              boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.08 : 0.42)}`,
            })}
          >
            <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography fontSize={14} fontWeight={900}>
                  Appearance
                </Typography>
                <Typography color="text.secondary" fontSize={12} fontWeight={700}>
                  {isDarkMode ? "Dark palette active" : "Light palette active"}
                </Typography>
              </Box>
              <Typography
                component="span"
                fontSize={11}
                fontWeight={900}
                letterSpacing="0.18em"
                color="secondary.main"
              >
                {isDarkMode ? "DARK" : "LIGHT"}
              </Typography>
            </Stack>

            <ButtonBase
              type="button"
              onClick={toggleTheme}
              role="switch"
              aria-checked={isDarkMode}
              aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
              sx={(theme) => ({
                position: "relative",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 0.5,
                width: "100%",
                minHeight: 46,
                borderRadius: 999,
                p: 0.5,
                color: "text.secondary",
                overflow: "hidden",
                border: `1px solid ${alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.14 : 0.44)}`,
                bgcolor: alpha(theme.palette.mode === "dark" ? "#000000" : theme.palette.primary.dark, theme.palette.mode === "dark" ? 0.22 : 0.08),
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 4,
                  bottom: 4,
                  left: 4,
                  width: "calc(50% - 4px)",
                  borderRadius: 999,
                  bgcolor: isDarkMode ? alpha(theme.palette.grey[950] || "#09090b", 0.84) : alpha(theme.palette.common.white, 0.88),
                  boxShadow: isDarkMode
                    ? "0 10px 28px rgba(0,0,0,0.34)"
                    : "0 10px 28px rgba(6,78,59,0.16)",
                  transform: isDarkMode ? "translateX(100%)" : "translateX(0)",
                  transition: "transform 220ms cubic-bezier(.2,.8,.2,1), background-color 180ms ease",
                },
                "&:hover": {
                  bgcolor: alpha(theme.palette.secondary.main, theme.palette.mode === "dark" ? 0.12 : 0.1),
                },
                "&:focus-visible": {
                  outline: `4px solid ${alpha(theme.palette.secondary.main, 0.28)}`,
                  outlineOffset: 2,
                },
              })}
            >
              <Stack
                direction="row"
                spacing={0.75}
                sx={{
                  position: "relative",
                  zIndex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  color: isDarkMode ? "text.secondary" : "primary.dark",
                }}
              >
                <LightModeRoundedIcon sx={{ fontSize: 18 }} />
                <Typography component="span" fontSize={13} fontWeight={900}>
                  Light
                </Typography>
              </Stack>
              <Stack
                direction="row"
                spacing={0.75}
                sx={{
                  position: "relative",
                  zIndex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  color: isDarkMode ? "secondary.light" : "text.secondary",
                }}
              >
                <DarkModeRoundedIcon sx={{ fontSize: 18 }} />
                <Typography component="span" fontSize={13} fontWeight={900}>
                  Dark
                </Typography>
              </Stack>
            </ButtonBase>
          </Stack>
        </Box>
      </Stack>
    </Drawer>
  );
};

export default SideMenu;
