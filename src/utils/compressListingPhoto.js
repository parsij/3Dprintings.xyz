const MAX_EDGE_PX = 1600;
const INITIAL_QUALITY = 0.82;
const MIN_QUALITY = 0.52;
const TARGET_MAX_BYTES = 450 * 1024;
const SKIP_IF_WEBP_UNDER_BYTES = 500 * 1024;

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not load ${file.name}.`));
    };

    image.src = url;
  });
}

function canvasToWebpBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Could not optimize photo."));
      },
      "image/webp",
      quality
    );
  });
}

function buildOptimizedFileName(fileName) {
  const trimmed = String(fileName || "photo").trim();
  const baseName = trimmed.replace(/\.[^.]+$/, "") || "photo";
  return `${baseName}.webp`;
}

export async function compressListingPhoto(file) {
  if (!file?.type?.startsWith("image/")) {
    return file;
  }

  if (file.type === "image/webp" && file.size <= SKIP_IF_WEBP_UNDER_BYTES) {
    return file;
  }

  const image = await loadImageFromFile(file);
  const longestEdge = Math.max(image.width, image.height, 1);
  const scale = Math.min(1, MAX_EDGE_PX / longestEdge);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not optimize photo.");
  }

  context.drawImage(image, 0, 0, width, height);

  let quality = INITIAL_QUALITY;
  let blob = await canvasToWebpBlob(canvas, quality);

  while (blob.size > TARGET_MAX_BYTES && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - 0.08);
    blob = await canvasToWebpBlob(canvas, quality);
  }

  return new File([blob], buildOptimizedFileName(file.name), {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

export async function compressListingPhotos(files) {
  const imageFiles = Array.from(files || []).filter((file) => file?.type?.startsWith("image/"));
  return Promise.all(imageFiles.map((file) => compressListingPhoto(file)));
}
