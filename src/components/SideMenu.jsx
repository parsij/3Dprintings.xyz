import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
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

const SideMenu = ({ title = "Menu", role = "customer" }) => {
  const { menuOpen, setMenuOpen } = useMenu();
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const isSeller = String(user?.role || "").trim().toLowerCase() === "seller";
  const activeItems = role === "seller" ? seller : buildCustomerMenuItems(isSeller);

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
            bgcolor: "rgba(3,7,18,0.48)",
            backdropFilter: "blur(3px)",
          },
        },
      }}
      PaperProps={{
        sx: (theme) => ({
          width: "min(21.5rem, 88vw)",
          borderRight: `1px solid ${theme.palette.divider}`,
          bgcolor: "background.paper",
          color: "text.primary",
          overflow: "hidden",
        }),
      }}
    >
      <Stack sx={{ height: "100%" }}>
        <Box
          sx={(theme) => ({
            position: "relative",
            overflow: "hidden",
            p: 2.5,
            borderBottom: `1px solid ${theme.palette.divider}`,
            backgroundImage: `linear-gradient(${alpha(theme.palette.primary.main, 0.07)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.07)} 1px, transparent 1px)`,
            backgroundSize: "44px 44px",
          })}
        >
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2} sx={{ position: "relative" }}>
            <Stack spacing={1.25}>
              <Stack direction="row" alignItems="center" spacing={1.25}>
                <Avatar variant="rounded" sx={{ bgcolor: "secondary.main", borderRadius: 3 }}>
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
              <Typography color="text.secondary" fontSize={14} fontWeight={650} lineHeight={1.65}>
                Find prints, manage orders, or start selling from one place.
              </Typography>
            </Stack>
            <IconButton onClick={closeMenu} aria-label="Close Menu" sx={{ borderRadius: 3 }}>
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
              sx={{
                borderRadius: 3,
                mb: 0.5,
                px: 2,
                py: 1.25,
                transition: "transform 160ms ease, background-color 160ms ease, color 160ms ease",
                "&:hover": {
                  transform: "translateX(4px)",
                  bgcolor: "action.hover",
                  color: "secondary.main",
                },
              }}
            >
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontSize: 14, fontWeight: 850 }}
              />
            </ListItemButton>
          ))}
        </List>

        <Divider />

        <Box sx={{ p: 2 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            sx={(theme) => ({
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 4,
              p: 1.5,
              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.08 : 0.04),
            })}
          >
            <Box>
              <Typography fontSize={14} fontWeight={900}>
                Appearance
              </Typography>
              <Typography color="text.secondary" fontSize={12} fontWeight={700}>
                {isDarkMode ? "Dark mode enabled" : "Light mode enabled"}
              </Typography>
            </Box>
            <Switch checked={isDarkMode} onChange={toggleTheme} inputProps={{ "aria-label": `Switch to ${isDarkMode ? "light" : "dark"} mode` }} />
          </Stack>
        </Box>
      </Stack>
    </Drawer>
  );
};

export default SideMenu;
