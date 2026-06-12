import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { useMenu } from "../../MenuContext.jsx";

const SellerNavBar = ({ pageName }) => {
  const { setMenuOpen } = useMenu();

  return (
    <AppBar
      position="fixed"
      color="transparent"
      elevation={0}
      sx={(theme) => ({
        borderBottom: `1px solid ${alpha(theme.palette.common.white, 0.16)}`,
        bgcolor: alpha(theme.palette.grey[950] || "#030712", 0.72),
        color: "common.white",
        backdropFilter: "blur(12px)",
      })}
    >
      <Toolbar component="nav" sx={{ px: { xs: 2, lg: "5vw" }, minHeight: "56px !important" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <IconButton
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Open menu"
            sx={{
              borderRadius: 3,
              color: "common.white",
              "&:hover": { bgcolor: "rgba(255,255,255,0.1)", color: "secondary.light" },
            }}
          >
            <MenuRoundedIcon />
          </IconButton>
        </Box>

        <Typography component="div" fontWeight={900} noWrap sx={{ maxWidth: { xs: "60vw", sm: "70vw" }, textAlign: "center" }}>
          {pageName}
        </Typography>

        <Box sx={{ flex: 1 }} aria-hidden="true" />
      </Toolbar>
    </AppBar>
  );
};

export default SellerNavBar;
