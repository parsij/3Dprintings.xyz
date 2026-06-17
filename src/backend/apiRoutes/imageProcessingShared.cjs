const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const MAX_EDGE_PX = 1600;
const MAX_INPUT_PIXELS = 40_000_000;
const INITIAL_WEBP_QUALITY = 78;
const MIN_WEBP_QUALITY = 42;
const TARGET_MAX_BYTES = 450 * 1024;

async function renderOptimizedWebp(inputPath, quality) {
  return sharp(inputPath, { failOn: "none", limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize({
      width: MAX_EDGE_PX,
      height: MAX_EDGE_PX,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 4 })
    .toBuffer();
}

async function optimizeUploadedProductPhoto(inputPath, outputPath) {
  let quality = INITIAL_WEBP_QUALITY;
  let buffer = await renderOptimizedWebp(inputPath, quality);

  while (buffer.length > TARGET_MAX_BYTES && quality > MIN_WEBP_QUALITY) {
    quality -= 8;
    buffer = await renderOptimizedWebp(inputPath, quality);
  }

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, buffer);

  if (path.resolve(inputPath) !== path.resolve(outputPath)) {
    await fs.promises.unlink(inputPath).catch(() => null);
  }

  return outputPath;
}

module.exports = {
  MAX_EDGE_PX,
  MAX_INPUT_PIXELS,
  optimizeUploadedProductPhoto,
};
