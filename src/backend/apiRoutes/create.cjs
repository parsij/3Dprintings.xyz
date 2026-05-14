const fs = require('fs');
const path = require('path');


module.exports = function createRoutes(deps) {
  const { app, pool, upload, cleanupUploadedFiles, MAX_PHOTOS, isAuthenticatedAnIisValid } = deps;

  app.post('/api/create', upload.array('photos', MAX_PHOTOS), async (req, res) => {
    const photos = req.files || [];

    try {
      const { isProfane } = await import('../../services/profanityFilter.js');
      const auth = isAuthenticatedAnIisValid(req, res, "create");
      if (!auth?.userId) return; // response is already sent in isAuthenticatedAnIisValid or we wait, wait, the response is actually sent inside isAuthenticatedAnIisValid so if it returns an object with user ID it is valid. But if not, it sends res and returns the res object.. Wait, if it fails, it returns res.status().json() which is undefined or object.

      const userId = auth.userId;
      const { modelName = '', description = '', price, category = '', tags } = req.body;
      const parsedPrice = Number(price);

      const fieldErrors = {};

      if (photos.length === 0) {
        fieldErrors.photos = 'Upload at least one printed model photo.';
      }

      if (photos.length > MAX_PHOTOS) {
        fieldErrors.photos = `You can upload up to ${MAX_PHOTOS} photos.`;
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

      const hasBadWords = isProfane(modelName) || isProfane(description) || parsedTags.some(tag => isProfane(tag));
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
      const insertProductQuery = `
        INSERT INTO products (
          name,
          description,
          original_price,
          current_price,
          rating,
          user_id,
          category,
          tags
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
        RETURNING id, name, description, original_price, current_price, rating, user_id, category, tags
      `;
      // Persist tags as explicit JSON for jsonb columns.
      const normalizedCategory = category ? category.trim() : null;
      const tagsJson = JSON.stringify(parsedTags);
      const productValues = [
        modelName.trim(),
        description.trim(),
        parsedPrice,
        parsedPrice,
        0,
        userId,
        normalizedCategory,
        tagsJson,
      ];
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

      // Ensure tags and category are stored correctly after insert.
      // Some DB schemas use text[] and others use jsonb; updating with the JS array will correctly map to text[]
      // and will also work for jsonb. Use a second update to be defensive and guarantee data is stored.
      try {
        await pool.query(
          `UPDATE products SET tags = $1::jsonb, category = $2 WHERE id = $3`,
          [tagsJson, normalizedCategory, productId]
        );
      } catch (e) {
        // Best-effort: log but don't break the create flow
        console.warn('Failed to run follow-up tags/category update:', e.message || e);
      }

      // Update tags usage in tags table
      for (const t of parsedTags) {
        await pool.query(
          `INSERT INTO tags (tag_name, uses)
           VALUES ($1, 1)
           ON CONFLICT (tag_name) DO UPDATE
           SET uses = tags.uses + 1`,
          [t]
        );
      }

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
