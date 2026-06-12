import { useState } from "react";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import image_test from "../assets/product-placeholder.webp";
import { addToCart } from "../services/cartService.js";
import { shopPath } from "../utils/shopName.js";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatPrice(price) {
  const amount = Number(price);
  if (!Number.isFinite(amount)) return "Price unavailable";

  return currencyFormatter.format(amount).replace(/\.00$/, "");
}

function getDiscountPercent(originalPrice, currentPrice) {
  const original = Number(originalPrice);
  const current = Number(currentPrice);
  if (!Number.isFinite(original) || !Number.isFinite(current) || original <= current) return 0;

  return Math.round(((original - current) / original) * 100);
}

const ProductCard = ({
  productId,
  creatorName,
  productName,
  rating,
  reviewNumber,
  currentPrice,
  originalPrice,
  imageUrl,
  shopName,
  shopLogoUrl,
  quantity,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const displayName = productName || "Untitled 3D print";
  const displayShopName = shopName || creatorName || "Independent maker";
  const productUrl = productId ? `/product/${productId}` : "/products";
  const sellerUrl = shopPath(shopName);
  const discountPercent = getDiscountPercent(originalPrice, currentPrice);
  const stockCount = quantity === undefined || quantity === null ? null : Number(quantity);
  const isSoldOut = Number.isFinite(stockCount) && stockCount <= 0;
  const isLowStock = Number.isFinite(stockCount) && stockCount > 0 && stockCount <= 2;

  const handleAddToCart = async () => {
    if (isLoading || success || isSoldOut || !productId) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await addToCart(productId, 1);
      setSuccess(true);
      window.setTimeout(() => setSuccess(false), 1400);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not add to cart. Try again.");
      window.setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card
      component="article"
      sx={(theme) => ({
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: theme.transitions.create(["box-shadow", "border-color", "transform"], { duration: 160 }),
        "&:hover": {
          transform: "translateY(-3px)",
          borderColor: alpha(theme.palette.secondary.main, 0.38),
          boxShadow: theme.palette.mode === "dark" ? "0 24px 60px rgba(0,0,0,0.5)" : "0 24px 64px rgba(6,78,59,0.18)",
        },
      })}
    >
      <CardActionArea component={RouterLink} to={productUrl} aria-label={`View ${displayName}`} sx={{ display: "block" }}>
        <Box sx={{ position: "relative", aspectRatio: "4 / 3", overflow: "hidden", bgcolor: "primary.50" }}>
          <CardMedia
            component="img"
            image={imageUrl || image_test}
            alt={displayName}
            loading="lazy"
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = image_test;
            }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: "linear-gradient(180deg, transparent 35%, rgba(5,46,34,0.44) 100%)",
            }}
          />
          {discountPercent > 0 && (
            <Chip
              label={`${discountPercent}% off`}
              color="secondary"
              size="small"
              sx={{ position: "absolute", left: 12, top: 12, color: "common.white" }}
            />
          )}
          {isLowStock && (
            <Chip
              label={`Only ${stockCount} left`}
              size="small"
              sx={{ position: "absolute", left: 12, bottom: 12, bgcolor: "background.paper", color: "secondary.dark" }}
            />
          )}
          {isSoldOut && (
            <Chip
              label="Sold out"
              color="primary"
              size="small"
              sx={{ position: "absolute", left: 12, bottom: 12, color: "common.white" }}
            />
          )}
        </Box>
      </CardActionArea>

      <CardContent sx={{ display: "flex", flex: 1, flexDirection: "column", gap: 1.75, p: { xs: 2, sm: 2.25 } }}>
        <Typography
          component={RouterLink}
          to={productUrl}
          variant="h6"
          sx={{
            minHeight: "3rem",
            color: "primary.dark",
            textDecoration: "none",
            lineHeight: 1.35,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            "&:hover": { color: "secondary.main" },
          }}
        >
          {displayName}
        </Typography>

        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
          {sellerUrl ? (
            <Stack
              component={RouterLink}
              to={sellerUrl}
              direction="row"
              alignItems="center"
              spacing={1}
              aria-label={`Visit ${displayShopName}`}
              sx={{ minWidth: 0, color: "text.secondary", textDecoration: "none", "&:hover": { color: "secondary.main" } }}
            >
              <Avatar src={shopLogoUrl || undefined} alt="" variant="rounded" sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: "primary.light", fontSize: 13, fontWeight: 900 }}>
                {displayShopName.slice(0, 1).toUpperCase()}
              </Avatar>
              <Typography noWrap fontSize={14} fontWeight={800} sx={{ minWidth: 0 }}>
                {displayShopName}
              </Typography>
            </Stack>
          ) : (
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0, color: "text.secondary" }}>
              <Avatar variant="rounded" sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: "primary.light", fontSize: 13, fontWeight: 900 }}>
                {displayShopName.slice(0, 1).toUpperCase()}
              </Avatar>
              <Typography noWrap fontSize={14} fontWeight={800} sx={{ minWidth: 0 }}>
                {displayShopName}
              </Typography>
            </Stack>
          )}

          <Chip
            size="small"
            label={`${Number(rating || 0).toFixed(1)} stars`}
            aria-label={`${Number(rating || 0).toFixed(1)} stars from ${reviewNumber || 0} reviews`}
            sx={(theme) => ({ bgcolor: alpha(theme.palette.secondary.main, 0.1), color: "secondary.dark", flexShrink: 0 })}
          />
        </Stack>

        <Box sx={{ mt: "auto" }}>
          <Stack direction="row" alignItems="baseline" spacing={1} flexWrap="wrap">
            <Typography variant="h5" color="primary.dark" sx={{ fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
              {formatPrice(currentPrice)}
            </Typography>
            {discountPercent > 0 && (
              <Typography color="text.disabled" fontWeight={800} sx={{ textDecoration: "line-through", fontVariantNumeric: "tabular-nums" }}>
                {formatPrice(originalPrice)}
              </Typography>
            )}
          </Stack>
          <Typography color="text.secondary" fontSize={12} fontWeight={800} sx={{ mt: 0.25 }}>
            Printed item, model file, or maker bundle
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" variant="outlined" sx={{ py: 0.5, fontSize: 12, fontWeight: 700 }}>
            {error}
          </Alert>
        )}

        <Button
          type="button"
          onClick={handleAddToCart}
          disabled={isLoading || success || isSoldOut}
          variant="contained"
          color={success ? "success" : isSoldOut ? "inherit" : "primary"}
          startIcon={isLoading ? <CircularProgress color="inherit" size={16} /> : null}
          sx={{ mt: 0.25, borderRadius: 3, py: 1.25 }}
        >
          {isSoldOut ? "Sold out" : success ? "Added" : isLoading ? "Adding..." : "Add to cart"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
