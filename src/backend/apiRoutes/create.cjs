const fs = require('fs');
const path = require('path');

module.exports = function createRoutes(deps) {
  const { app, pool, upload, cleanupUploadedFiles, MAX_PHOTOS, getAuthUserFromRequest } = deps;

  app.post('/api/create', upload.array('photos', MAX_PHOTOS), async (req, res) => {
    const photos = req.files || [];

    try {
          const userId = getAuthUserFromRequest(req)?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated.' });
    }
      const { modelName = '', description = '', price, category = '', tags } = req.body;
      const parsedPrice = Number(price);

      const fieldErrors = {};

      if (modelName.trim().length < 3) {
        fieldErrors.modelName = 'Model name must be at least 3 characters.';
      }

      if (!getAuthUserFromRequest(req)?.id) {
        fieldErrors.userId = 'User not authenticated.(missing user id)';
      }

      if (description.trim().length < 20) {
        fieldErrors.description = 'Description must be at least 20 characters.';
      }

      if (!price || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
        fieldErrors.price = 'Enter a valid price greater than 0.';
      }

      if (photos.length === 0) {
        fieldErrors.photos = 'Upload at least one printed model photo.';
      }

      if (photos.length > MAX_PHOTOS) {
        fieldErrors.photos = `You can upload up to ${MAX_PHOTOS} photos.`;
      }
      if (Object.keys(fieldErrors).length > 0) {
        await cleanupUploadedFiles(photos);
        return res.status(400).json({
          message: 'Validation failed.',
          errors: fieldErrors,
        });
      }

      // Parse tags
      let parsedTags = [];
      if (typeof tags === 'string' && tags.trim().length > 0) {
        try {
          const rawTags = JSON.parse(tags);
          if (Array.isArray(rawTags)) {
            parsedTags = rawTags.map((tag) => String(tag).trim()).filter(Boolean);
          }
        } catch {
          parsedTags = tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);
        }
      }

      // Insert product (without images first)
      const insertProductQuery = `
        INSERT INTO products (
          name,
          description,
          original_price,
          current_price,
          rating,
          user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, description, original_price, current_price, rating, user_id
--         remove unnecessary userID
      `;
      const productValues = [modelName.trim(), description.trim(), parsedPrice, parsedPrice, 0, userId];
      const productResult = await pool.query(insertProductQuery, productValues);
      const product = productResult.rows[0];
      const productId = product.id;

      // Rename photo files and collect their new names
      const renamedPhotos = await Promise.all(
        photos.map(async (file, index) => {
          const extension = path.extname(file.filename || file.originalname || '').toLowerCase() || '.jpg';
          const renamedFileName = `${productId}-${index + 1}${extension}`;
          const renamedFilePath = path.join(path.dirname(file.path), renamedFileName);

          await fs.promises.rename(file.path, renamedFilePath);

          file.filename = renamedFileName;
          file.path = renamedFilePath;
          return file;
        })
      );
      const imageFileNames = renamedPhotos.map(file => file.filename);

      // Update product img_path column with the array of file names
      await pool.query(
        `UPDATE products SET img_path = $1 WHERE id = $2`,
        [imageFileNames, productId]
      );

      // Respond
      return res.status(201).json({
        message: 'your model is successfully listed.',
        product: {
          ...product,
          img_path: imageFileNames // include the new images in response
        },
        category: category.trim() || null,
        tags: parsedTags,
        photoCount: renamedPhotos.length,
        photos: renamedPhotos.map((file) => ({
          fileName: file.filename,
          url: `/imgUploads/${file.filename}`,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        })),
      });

    } catch (error) {
      await cleanupUploadedFiles(photos);
      console.error('Create listing error:', error.message);
      return res.status(500).json({ message: 'Server error' });
    }
  });
};