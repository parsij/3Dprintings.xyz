const path = require('path');


const {
  parseAndValidateProductDimensions,
} = require("./productDimensionsShared.cjs");
const {
  listSellerBoxes,
} = require('./sellerBoxesShared.cjs');
const { productFitsInAnyBox, getProductBoxFitMessage } = require('./sellerBoxPackingShared.cjs');
const { isSellerOnboardingComplete, getSellerOnboardingState } = require('./sellerOnboardingShared.cjs');
const { optimizeUploadedProductPhoto } = require('./imageProcessingShared.cjs');

module.exports = function createRoutes(deps) {
  const { app, pool, upload, cleanupUploadedFiles, MAX_PHOTOS, isAuthenticatedAnIisValid, enqueueWrite } = deps;

  app.post('/api/create', upload.array('photos', MAX_PHOTOS), async (req, res) => {
    const photos = req.files || [];

    try {
      const { isProfane } = await import('../../services/profanityFilter.js');
      const auth = isAuthenticatedAnIisValid(req, res, "create");
      if (!auth?.userId) return; // response is already sent in isAuthenticatedAnIisValid or we wait, wait, the response is actually sent inside isAuthenticatedAnIisValid so if it returns an object with user ID it is valid. But if not, it sends res and returns the res object.. Wait, if it fails, it returns res.status().json() which is undefined or object.

      const userId = auth.userId;

      const sellerResult = await pool.query(
        `SELECT COALESCE(role, 'customer') AS role FROM users WHERE id = $1`,
        [userId]
      );
      if (sellerResult.rows.length === 0) {
        await cleanupUploadedFiles(photos);
        return res.status(404).json({
          message: 'User not found.',
          errors: { general: 'Your account could not be found. Please sign in again.' },
        });
      }
      if (sellerResult.rows[0].role !== 'seller') {
        await cleanupUploadedFiles(photos);
        return res.status(403).json({
          message: 'Seller access is required to list products.',
          errors: { general: 'Seller access is required to list products.' },
        });
      }

      const onboarding = await getSellerOnboardingState(pool, userId);
      if (!isSellerOnboardingComplete(onboarding.completionStep)) {
        await cleanupUploadedFiles(photos);
        return res.status(403).json({
          message: 'Complete seller onboarding before listing products.',
          errors: {
            general: 'Complete seller onboarding before listing products.',
          },
          completionStep: onboarding.completionStep,
        });
      }

      const { modelName = '', description = '', price, category = '', tags, quantity } = req.body;
      let dimensions;
      try {
        dimensions = parseAndValidateProductDimensions(req.body);
      } catch (dimensionError) {
        await cleanupUploadedFiles(photos);
        const field = dimensionError.field || 'dimensions';
        return res.status(dimensionError.statusCode || 400).json({
          message: 'Validation failed.',
          errors: {
            [field]: dimensionError.message || 'Invalid model dimensions.',
          },
        });
      }

      const trimmedModelName = String(modelName).trim();
      const trimmedDescription = String(description).trim();
      const trimmedCategory = String(category).trim();
      const parsedPrice = Number(price);
      const rawQuantity = req.body?.quantity;
      const parsedQuantity = Number(rawQuantity);

      const fieldErrors = {};

      if (photos.length === 0) {
        fieldErrors.photos = 'Upload at least one printed model photo.';
      }

      if (photos.length > MAX_PHOTOS) {
        fieldErrors.photos = `You can upload up to ${MAX_PHOTOS} photos.`;
      }

      if (trimmedModelName.length < 3) {
        fieldErrors.modelName = 'Model name must be at least 3 characters.';
      } else if (!/^[a-zA-Z0-9 ]+$/.test(trimmedModelName)) {
        fieldErrors.modelName = 'Model name can only contain letters, numbers, and spaces.';
      }

      if (trimmedDescription.length < 20) {
        fieldErrors.description = 'Description must be at least 20 characters.';
      }

      if (price === undefined || price === null || String(price).trim() === '' || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
        fieldErrors.price = 'Enter a valid price greater than 0.';
      } else if (parsedPrice > 100000) {
        fieldErrors.price = 'Price cannot exceed $100,000.';
      }

      if (!trimmedCategory) {
        fieldErrors.category = 'Please select a specific category.';
      } else if (trimmedCategory.length > 100) {
        fieldErrors.category = 'Category is too long.';
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

      // Parse tags
      let parsedTags = [];
      if (typeof tags === 'string' && tags.trim().length > 0) {
        try {
          const rawTags = JSON.parse(tags);
          if (Array.isArray(rawTags)) {
            parsedTags = rawTags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean);
          }
        } catch {
          parsedTags = tags
            .split(',')
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean);
        }
      }

      // Remove duplicates
      parsedTags = [...new Set(parsedTags)];

      const hasBadWords = isProfane(trimmedModelName) || isProfane(trimmedDescription) || parsedTags.some(tag => isProfane(tag));
      if (hasBadWords) {
        fieldErrors.general = 'Explicit content or bad words are not allowed in the title, description, or tags.';
      }

      if (Object.keys(fieldErrors).length > 0) {
        await cleanupUploadedFiles(photos);
        return res.status(400).json({
          message: 'Validation failed.',
          errors: fieldErrors,
        });
      }

      const sellerBoxes = await listSellerBoxes(pool, userId);
      if (sellerBoxes.length === 0) {
        await cleanupUploadedFiles(photos);
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
          model_weight_g: dimensions.modelWeightG,
          model_height_mm: dimensions.modelHeightMm,
          model_width_mm: dimensions.modelWidthMm,
          model_length_mm: dimensions.modelLengthMm,
        },
        sellerBoxes
      );

      if (!fitResult.fits) {
        await cleanupUploadedFiles(photos);
        const fitMessage = getProductBoxFitMessage(fitResult.reason);
        return res.status(400).json({
          message: fitMessage,
          errors: { general: fitMessage },
          boxesUrl: '/boxes',
        });
      }

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
          days_to_prepare
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id, name, description, original_price, current_price, rating, user_id, category, tags, quantity,
                  model_weight_g, model_height_mm, model_width_mm, model_length_mm,
                  model_weight_unit, model_dimension_unit, days_to_prepare
      `;
      const normalizedCategory = trimmedCategory || null;
      const tagsJson = JSON.stringify(parsedTags);
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
        dimensions.modelWeightG,
        dimensions.modelHeightMm,
        dimensions.modelWidthMm,
        dimensions.modelLengthMm,
        dimensions.modelWeightUnit,
        dimensions.modelDimensionUnit,
        dimensions.daysToPrepare,
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
          await cleanupUploadedFiles(photos);
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
      await cleanupUploadedFiles(photos);
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
