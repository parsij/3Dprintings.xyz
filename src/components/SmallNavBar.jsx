import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { Link as RouterLink } from "react-router-dom";
import { useMenu } from "../MenuContext.jsx";

export const SmallNavBar = () => {
  const { setMenuOpen } = useMenu();

  return (
    <AppBar position="fixed" color="transparent" elevation={0} sx={{ px: { xs: 1.5, sm: 2.5 }, pt: 1.5 }}>
      <Toolbar
        component="nav"
        disableGutters
        sx={(theme) => ({
          mx: "auto",
          width: "100%",
          maxWidth: 1280,
          minHeight: "64px !important",
          justifyContent: "space-between",
          borderRadius: 4,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === "dark" ? 0.9 : 0.88),
          color: "text.primary",
          px: 2,
          py: 1,
          boxShadow: "0 14px 42px rgba(17,24,39,0.12)",
          backdropFilter: "blur(18px)",
        })}
      >
        <Stack
          component={RouterLink}
          to="/home"
          direction="row"
          alignItems="center"
          spacing={1.25}
          aria-label="3Dprintings.xyz Home"
          translate="no"
          sx={{ color: "inherit", textDecoration: "none" }}
        >
          <Avatar variant="rounded" sx={{ borderRadius: 3, bgcolor: "primary.dark", color: "secondary.light", fontWeight: 900 }}>
            3D
          </Avatar>
          <Box>
            <Typography component="span" display="block" fontWeight={900} letterSpacing="-0.02em">
              3Dprintings
            </Typography>
            <Typography component="span" display="block" fontSize={11} fontWeight={900} letterSpacing="0.2em" color="secondary.main">
              MARKETPLACE
            </Typography>
          </Box>
        </Stack>

        <IconButton
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Open Menu"
          sx={(theme) => ({
            width: 44,
            height: 44,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.secondary.main, 0.08),
            color: "text.primary",
            "&:hover": { bgcolor: alpha(theme.palette.secondary.main, 0.16) },
          })}
        >
          <MenuRoundedIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default SmallNavBar;
