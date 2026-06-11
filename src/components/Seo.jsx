import { Helmet } from "react-helmet-async";
import { MARKETPLACE_ORIGIN } from "../config/api.js";

const SITE_NAME = "3Dprintings.xyz";
const DEFAULT_DESCRIPTION =
  "Shop physical 3D printed parts and downloadable 3D model files from independent creators on 3Dprintings.xyz.";
const DEFAULT_KEYWORDS =
  "3D printed parts, 3D prints, STL files, 3D model files, maker marketplace, custom 3D printing";

function buildCanonicalUrl(path = "/home") {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${MARKETPLACE_ORIGIN}${normalizedPath}`;
}

export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/home",
  image = `${MARKETPLACE_ORIGIN}/social-preview.svg`,
  imageAlt = "3Dprintings.xyz marketplace for physical 3D prints and downloadable model files",
  keywords = DEFAULT_KEYWORDS,
  noIndex = false,
  jsonLd,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const canonicalUrl = buildCanonicalUrl(path);
  const structuredData = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
  const robotsContent = noIndex
    ? "noindex,nofollow"
    : "index,follow,max-snippet:160,max-image-preview:large";

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />
      <meta name="robots" content={robotsContent} />
      <meta name="googlebot" content={robotsContent} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:image:alt" content={imageAlt} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={imageAlt} />

      {structuredData.map((item, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  );
}
