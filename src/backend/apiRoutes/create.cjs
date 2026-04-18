const {user} = require("pg/lib/defaults");
module.exports = function createRoutes(deps) {
  const { app, pool, upload, cleanupUploadedFiles, MAX_PHOTOS, getAuthUserFromRequest} = deps;

  app.post('/api/create', upload.array('photos', MAX_PHOTOS), async (req, res) => {
    const photos = req.files || [];

    try {
      const { modelName = '', description = '', price, category = '', tags} = req.body;
      const parsedPrice = Number(price);

      const fieldErrors = {};

      if (modelName.trim().length < 3) {
        fieldErrors.modelName = 'Model name must be at least 3 characters.';
      }

      if (getAuthUserFromRequest(req).id === null ||
          getAuthUserFromRequest(req).id === '' ||
          getAuthUserFromRequest(req).id === undefined) {
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
      const userId = getAuthUserFromRequest(req).id

      if (Object.keys(fieldErrors).length > 0) {
        await cleanupUploadedFiles(photos);
        return res.status(400).json({
          message: 'Validation failed.',
          errors: fieldErrors,
        });
      }

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
    `;

      const productValues = [modelName.trim(), description.trim(), parsedPrice, parsedPrice, 0 , userId];

      const productResult = await pool.query(insertProductQuery, productValues);

      return res.status(201).json({
        message: 'your model  is successfully listed.',
        product: productResult.rows[0],
        category: category.trim() || null,
        tags: parsedTags,
        photoCount: photos.length,
        photos: photos.map((file) => ({
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

