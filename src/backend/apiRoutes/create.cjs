const path = require('path');
const fs = require('fs');


const {
  parseAndValidateProductDimensions,
} = require("./productDimensionsShared.cjs");
const {
  listSellerBoxes,
} = require('./sellerBoxesShared.cjs');
const { productFitsInAnyBox, getProductBoxFitMessage } = require('./sellerBoxPackingShared.cjs');
const { isSellerOnboardingComplete, getSellerOnboardingState } = require('./sellerOnboardingShared.cjs');
const { optimizeUploadedProductPhoto } = require('./imageProcessingShared.cjs');
const { parseListingMetadata, validateListingMetadata } = require('./listingMetadataShared.cjs');
const {
  parseListingExtras,
  validateListingExtras,
  validateListingTitle,
  validateTags,
} = require('./listingExtrasShared.cjs');
const { getSellerShippingProfile } = require('./sellerShippingProfilesShared.cjs');
const { validateListingCategory } = require('./listingCategoriesShared.cjs');

const ALLOWED_PHOTO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif']);
const ALLOWED_VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov']);

function processingTimeToDays(processingTime) {
  const mapping = {
    '1_day': 1,
    '1_2_days': 2,
    '1_3_days': 3,
    '2_4_days': 4,
    '3_7_days': 7,
  };
  return mapping[String(processingTime || '').trim()] || 3;
}

function parsePackedDimensions(body = {}) {
  return parseAndValidateProductDimensions({
    modelWeight: body.packedWeight ?? body.packed_weight,
    modelWeightUnit: body.packedWeightUnit ?? body.packed_weight_unit,
    modelHeight: body.packedHeight ?? body.packed_height,
    modelWidth: body.packedWidth ?? body.packed_width,
    modelLength: body.packedLength ?? body.packed_length,
    modelDimensionUnit: body.packedDimensionUnit ?? body.packed_dimension_unit,
    modelWeightG: body.packedWeightG ?? body.packed_weight_g,
    modelHeightMm: body.packedHeightMm ?? body.packed_height_mm,
    modelWidthMm: body.packedWidthMm ?? body.packed_width_mm,
    modelLengthMm: body.packedLengthMm ?? body.packed_length_mm,
  });
}

function fileHasExtension(file, allowedExtensions) {
  const extension = path.extname(file?.originalname || file?.filename || '').toLowerCase();
  return Boolean(extension) && allowedExtensions.has(extension);
}

async function uploadedVideoHasExpectedSignature(file) {
  let handle;
  try {
    handle = await fs.promises.open(file.path, 'r');
    const buffer = Buffer.alloc(16);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead < 4) return false;

    const extension = path.extname(file.originalname || file.filename || '').toLowerCase();
    if (extension === '.webm') {
      return buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
    }

    if (extension === '.mp4' || extension === '.mov') {
      return buffer.slice(4, 8).toString('ascii') === 'ftyp';
    }

    return false;
  } catch {
    return false;
  } finally {
    await handle?.close();
  }
}

async function validateUploadedMedia({ photos, videos, maxPhotos, maxPhotoSize, maxVideos }) {
  const fieldErrors = {};

  if (photos.length === 0) {
    fieldErrors.photos = 'Upload at least one printed model photo.';
  } else if (photos.length > maxPhotos) {
    fieldErrors.photos = `You can upload up to ${maxPhotos} photos.`;
  } else if (maxPhotoSize && photos.some((file) => Number(file.size || 0) > maxPhotoSize)) {
    fieldErrors.photos = 'Each photo must be 50 MB or smaller.';
  } else if (photos.some((file) => !String(file.mimetype || '').startsWith('image/') || !fileHasExtension(file, ALLOWED_PHOTO_EXTENSIONS))) {
    fieldErrors.photos = 'Only JPG, PNG, WEBP, GIF, HEIC, and HEIF images are allowed.';
  }

  if (videos.length > (maxVideos || 1)) {
    fieldErrors.videos = `You can upload up to ${maxVideos || 1} video.`;
  } else if (videos.some((file) => !String(file.mimetype || '').startsWith('video/') || !fileHasExtension(file, ALLOWED_VIDEO_EXTENSIONS))) {
    fieldErrors.videos = 'Only MP4, WEBM, and MOV videos are allowed.';
  } else {
    for (const video of videos) {
      if (!await uploadedVideoHasExpectedSignature(video)) {
        fieldErrors.videos = 'Video file type does not match its contents.';
        break;
      }
    }
  }

  return fieldErrors;
}

function parseTagsInput(rawTags) {
  if (rawTags == null || rawTags === '') {
    return [];
  }

  if (Array.isArray(rawTags)) {
    return rawTags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean);
  }

  if (typeof rawTags !== 'string') {
    return [];
  }

  const trimmed = rawTags.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean);
    }
  } catch {
    // Fall back to comma-separated tags for older clients.
  }

  return trimmed
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

function hasValidMoneyPrecision(value) {
  return /^\d+(\.\d{1,2})?$/.test(String(value || '').trim());
}

module.exports = function createRoutes(deps) {
  const {
    app,
    pool,
    upload,
    listingMediaUpload,
    cleanupUploadedFiles,
    MAX_PHOTOS,
    MAX_PHOTO_SIZE,
    MAX_VIDEOS,
    isAuthenticatedAnIisValid,
    enqueueWrite,
  } = deps;

  const listingUpload = listingMediaUpload || upload.array('photos', MAX_PHOTOS);

  app.post('/api/create', listingUpload, async (req, res) => {
    const uploadedPhotos = Array.isArray(req.files?.photos)
      ? req.files.photos
      : Array.isArray(req.files)
        ? req.files
        : [];
    const uploadedVideos = Array.isArray(req.files?.videos) ? req.files.videos : [];
    const photos = uploadedPhotos;

    try {
      const { isProfane } = await import('../../services/profanityFilter.js');
      const auth = isAuthenticatedAnIisValid(req, res, "nothing");
      if (!auth?.userId) {
        await cleanupUploadedFiles([...photos, ...uploadedVideos]);
        return;
      }

      const userId = auth.userId;

      const sellerResult = await pool.query(
        `SELECT COALESCE(role, 'customer') AS role FROM users WHERE id = $1`,
        [userId]
      );
      if (sellerResult.rows.length === 0) {
        await cleanupUploadedFiles([...photos, ...uploadedVideos]);
        return res.status(404).json({
          message: 'User not found.',
          errors: { general: 'Your account could not be found. Please sign in again.' },
        });
      }
      if (sellerResult.rows[0].role !== 'seller') {
        await cleanupUploadedFiles([...photos, ...uploadedVideos]);
        return res.status(403).json({
          message: 'Seller access is required to list products.',
          errors: { general: 'Seller access is required to list products.' },
        });
      }

      const onboarding = await getSellerOnboardingState(pool, userId);
      if (!isSellerOnboardingComplete(onboarding.completionStep)) {
        await cleanupUploadedFiles([...photos, ...uploadedVideos]);
        return res.status(403).json({
          message: 'Complete seller onboarding before listing products.',
          errors: {
            general: 'Complete seller onboarding before listing products.',
          },
          completionStep: onboarding.completionStep,
        });
      }

      const { modelName = '', description = '', price, category = '', tags, quantity } = req.body;
      const listingMetadata = parseListingMetadata(req.body);
      const listingExtras = parseListingExtras(req.body);
      let dimensions = null;
      let packedDimensions = null;

      if (listingMetadata.itemType === 'physical') {
        try {
          dimensions = parseAndValidateProductDimensions(req.body);
        } catch (dimensionError) {
          await cleanupUploadedFiles([...photos, ...uploadedVideos]);
          const field = dimensionError.field || 'dimensions';
          return res.status(dimensionError.statusCode || 400).json({
            message: 'Validation failed.',
            errors: {
              [field]: dimensionError.message || 'Invalid model dimensions.',
            },
          });
        }

        try {
          packedDimensions = parsePackedDimensions(req.body);
        } catch (dimensionError) {
          await cleanupUploadedFiles([...photos, ...uploadedVideos]);
          const field = dimensionError.field || 'packedWeight';
          return res.status(dimensionError.statusCode || 400).json({
            message: 'Validation failed.',
            errors: {
              [field]: dimensionError.message || 'Invalid packed item dimensions.',
            },
          });
        }
      }

      const trimmedModelName = String(modelName).trim();
      const trimmedDescription = String(description).trim();
      const trimmedCategory = String(category).trim();
      const parsedPrice = Number(price);
      const rawQuantity = req.body?.quantity;
      const parsedQuantity = Number(rawQuantity);

      const fieldErrors = {};
      Object.assign(fieldErrors, await validateUploadedMedia({
        photos,
        videos: uploadedVideos,
        maxPhotos: MAX_PHOTOS,
        maxPhotoSize: MAX_PHOTO_SIZE,
        maxVideos: MAX_VIDEOS,
      }));

      if (trimmedModelName.length < 1) {
        fieldErrors.modelName = 'Title must be at least 1 character.';
      } else if (trimmedModelName.length > 120) {
        fieldErrors.modelName = 'Title must be at most 120 characters.';
      } else if (!/^[a-zA-Z0-9 ]+$/.test(trimmedModelName)) {
        fieldErrors.modelName = 'Title can only contain letters, numbers, and spaces.';
      }

      if (trimmedDescription.length < 20) {
        fieldErrors.description = 'Description must be at least 20 characters.';
      } else if (trimmedDescription.length > 5000) {
        fieldErrors.description = 'Description must be 5,000 characters or less.';
      }

      if (price === undefined || price === null || String(price).trim() === '' || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
        fieldErrors.price = 'Enter a valid price greater than 0.';
      } else if (!hasValidMoneyPrecision(price)) {
        fieldErrors.price = 'Price can include up to 2 decimal places.';
      } else if (parsedPrice > 100000) {
        fieldErrors.price = 'Price cannot exceed $100,000.';
      }

      const categoryError = validateListingCategory(trimmedCategory);
      if (categoryError) {
        fieldErrors.category = categoryError;
      }

      Object.assign(fieldErrors, validateListingMetadata(listingMetadata));
      Object.assign(fieldErrors, validateListingExtras(listingExtras, listingMetadata));

      const titleError = validateListingTitle(trimmedModelName);
      if (titleError) {
        fieldErrors.modelName = titleError;
      }

      if (
        rawQuantity === undefined
        || rawQuantity === null
        || String(rawQuantity).trim() === ''
        || Number.isNaN(parsedQuantity)
        || parsedQuantity <= 0
        || !Number.isInteger(parsedQuantity)
      ) {
        fieldErrors.quantity = 'Enter a valid whole number quantity greater than 0.';
      } else if (parsedQuantity > 100000) {
        fieldErrors.quantity = 'Quantity cannot exceed 100,000.';
      }

      const parsedTags = [...new Set(parseTagsInput(tags))];

      const tagError = validateTags(parsedTags);
      if (tags != null && tags !== '' && typeof tags !== 'string' && !Array.isArray(tags)) {
        fieldErrors.tags = 'Tags must be a list.';
      } else if (tagError) {
        fieldErrors.tags = tagError;
      }

      let shippingProfile = null;
      if (listingMetadata.itemType === 'physical' && listingExtras.shippingProfileId != null) {
        shippingProfile = await getSellerShippingProfile(
          pool,
          userId,
          Number(listingExtras.shippingProfileId)
        );
        if (!shippingProfile) {
          fieldErrors.shippingProfileId = 'Select a valid shipping profile.';
        }
      } else if (listingMetadata.itemType === 'physical') {
        fieldErrors.shippingProfileId = 'Select a shipping profile for physical items.';
      }

      const hasBadWords = isProfane(trimmedModelName) || isProfane(trimmedDescription) || parsedTags.some(tag => isProfane(tag));
      if (hasBadWords) {
        fieldErrors.general = 'Explicit content or bad words are not allowed in the title, description, or tags.';
      }

      if (Object.keys(fieldErrors).length > 0) {
        await cleanupUploadedFiles([...photos, ...uploadedVideos]);
        return res.status(400).json({
          message: 'Validation failed.',
          errors: fieldErrors,
        });
      }

      if (listingMetadata.itemType === 'physical') {
        const sellerBoxes = await listSellerBoxes(pool, userId);
        if (sellerBoxes.length === 0) {
          await cleanupUploadedFiles([...photos, ...uploadedVideos]);
          return res.status(400).json({
            message: 'You must add at least one shipping box before listing products.',
            errors: {
              general: 'You must add at least one shipping box before listing products.',
            },
            boxesUrl: '/boxes',
          });
        }

        const fitResult = await productFitsInAnyBox(
          {
            name: trimmedModelName,
            model_weight_g: packedDimensions?.modelWeightG ?? dimensions.modelWeightG,
            model_height_mm: packedDimensions?.modelHeightMm ?? dimensions.modelHeightMm,
            model_width_mm: packedDimensions?.modelWidthMm ?? dimensions.modelWidthMm,
            model_length_mm: packedDimensions?.modelLengthMm ?? dimensions.modelLengthMm,
          },
          sellerBoxes
        );

        if (!fitResult.fits) {
          await cleanupUploadedFiles([...photos, ...uploadedVideos]);
          const fitMessage = getProductBoxFitMessage(fitResult.reason);
          return res.status(400).json({
            message: fitMessage,
            errors: { general: fitMessage },
            boxesUrl: '/boxes',
          });
        }
      }

      const daysToPrepare = listingMetadata.itemType === 'physical'
        ? (shippingProfile
          ? processingTimeToDays(shippingProfile.processingTime)
          : dimensions.daysToPrepare)
        : 1;

      const insertProductQuery = `
        INSERT INTO products (
          name,
          description,
          original_price,
          current_price,
          rating,
          user_id,
          category,
          tags,
          quantity,
          model_weight_g,
          model_height_mm,
          model_width_mm,
          model_length_mm,
          model_weight_unit,
          model_dimension_unit,
          days_to_prepare,
          item_type,
          made_by,
          item_kind,
          material_type,
          ai_used,
          primary_color,
          secondary_color,
          variations,
          shipping_profile_id,
          packed_weight_g,
          packed_height_mm,
          packed_width_mm,
          packed_length_mm,
          packed_weight_unit,
          packed_dimension_unit,
          video_path
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24::jsonb, $25, $26, $27, $28, $29, $30, $31, $32)
        RETURNING id, name, description, original_price, current_price, rating, user_id, category, tags, quantity,
                  model_weight_g, model_height_mm, model_width_mm, model_length_mm,
                  model_weight_unit, model_dimension_unit, days_to_prepare,
                  item_type, made_by, item_kind, material_type, ai_used,
                  primary_color, secondary_color, variations, shipping_profile_id,
                  packed_weight_g, packed_height_mm, packed_width_mm, packed_length_mm,
                  packed_weight_unit, packed_dimension_unit, video_path
      `;
      const normalizedCategory = trimmedCategory || null;
      const tagsJson = JSON.stringify(parsedTags);
      const variationsJson = JSON.stringify(listingExtras.variations || []);
      const videoFileNames = uploadedVideos.map((file) => file.filename);
      const productValues = [
        trimmedModelName,
        trimmedDescription,
        parsedPrice,
        parsedPrice,
        0,
        userId,
        normalizedCategory,
        tagsJson,
        parsedQuantity,
        dimensions?.modelWeightG ?? null,
        dimensions?.modelHeightMm ?? null,
        dimensions?.modelWidthMm ?? null,
        dimensions?.modelLengthMm ?? null,
        dimensions?.modelWeightUnit ?? 'lb',
        dimensions?.modelDimensionUnit ?? 'in',
        daysToPrepare,
        listingMetadata.itemType,
        listingMetadata.madeBy,
        listingMetadata.itemKind,
        listingMetadata.itemType === 'physical' ? listingMetadata.materialType : null,
        listingMetadata.aiUsed,
        listingExtras.primaryColor || null,
        listingExtras.secondaryColor || null,
        variationsJson,
        shippingProfile?.id || null,
        packedDimensions?.modelWeightG || null,
        packedDimensions?.modelHeightMm || null,
        packedDimensions?.modelWidthMm || null,
        packedDimensions?.modelLengthMm || null,
        req.body?.packedWeightUnit || req.body?.packed_weight_unit || 'lb',
        req.body?.packedDimensionUnit || req.body?.packed_dimension_unit || 'in',
        videoFileNames.length > 0 ? videoFileNames : null,
      ];
      const productResult = await pool.query(insertProductQuery, productValues);
      const product = productResult.rows[0];
      const productId = product.id;

      // Rename photo files and collect their new names
      const renamedPhotos = [];
      for (const [index, file] of photos.entries()) {
        const renamedFileName = `${productId}-${index + 1}.webp`;
        const renamedFilePath = path.join(path.dirname(file.path), renamedFileName);

        try {
          await optimizeUploadedProductPhoto(file.path, renamedFilePath);
        } catch (optimizeError) {
          await cleanupUploadedFiles([...photos, ...uploadedVideos]);
          await pool.query('DELETE FROM products WHERE id = $1 AND user_id = $2', [productId, userId]);
          console.error('Photo optimization error:', optimizeError?.message);
          return res.status(400).json({
            message: 'Could not process one of your photos. Try a different image.',
            errors: {
              photos: 'Could not process one of your photos. Try a different image.',
            },
          });
        }

        file.filename = renamedFileName;
        file.path = renamedFilePath;
        file.mimetype = 'image/webp';
        renamedPhotos.push(file);
      }
      const imageFileNames = renamedPhotos.map(file => file.filename);

      await pool.query(
        `UPDATE products SET img_path = $1 WHERE id = $2`,
        [imageFileNames, productId]
      );

      await pool.query(
        `UPDATE products SET tags = $1::jsonb, category = $2 WHERE id = $3`,
        [tagsJson, normalizedCategory, productId]
      );

      if (parsedTags.length > 0) {
        await enqueueWrite('tags.bumpUsage', { tags: parsedTags });
      }

      // Respond
      return res.status(201).json({
        message: 'your model is successfully listed.',
        product: {
          ...product,
          img_path: imageFileNames // include the new images in response
        },
        category: normalizedCategory,
        tags: parsedTags,
        photoCount: renamedPhotos.length,
        photos: renamedPhotos.map((file) => ({
          fileName: file.filename,
          url: `/api/imgUploads/${file.filename}`,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        })),
      });

    } catch (error) {
      await cleanupUploadedFiles([...(req.files?.photos || req.files || []), ...(req.files?.videos || [])]);
      console.error('Create listing error:', {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
      });

      if (error?.code === '42P01') {
        return res.status(500).json({
          message: 'Listing could not be saved because required database tables are missing.',
          errors: {
            general: 'Listing could not be saved because the database setup is incomplete.',
          },
        });
      }

      if (error?.code === '42703') {
        return res.status(500).json({
          message: 'Listing could not be saved because the database schema is out of date.',
          errors: {
            general: 'Listing could not be saved because the database schema is out of date.',
          },
        });
      }

      return res.status(500).json({
        message: 'We could not save your listing right now. Please try again in a few minutes.',
        errors: {
          general: 'We could not save your listing right now. Please try again in a few minutes.',
        },
      });
    }
  });
};
