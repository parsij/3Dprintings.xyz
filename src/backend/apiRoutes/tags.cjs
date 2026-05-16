module.exports = function tagsRoutes(deps) {
  const { app, pool,getAuthUserFromRequest} = deps;

  app.get('/api/tags', async (req, res) => {
    try {
      if (!getAuthUserFromRequest(req)) {
  return res.status(401).json({ message: 'User not authenticated.' });
}
      const tag = String(req.query.tag || '').toLowerCase().trim();
      const isLettersOnly = /^[a-z]+$/.test(tag);
      if (!isLettersOnly) {
        return res.status(400).json({ message: 'unallowed characters' });
      }

      const result = await pool.query(
        `
      SELECT tag_name, uses
      FROM tags
      WHERE tag_name ILIKE '%' || $1 || '%'
      ORDER BY uses DESC
      LIMIT 6
      `,
        [tag]
      );

      if (result.rows.length === 0) {
        return res.json({ tagsAndUses: [{ tag_name: tag, uses: 0 }] });
      }
      return res.json({ tagsAndUses: result.rows });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: 'server error' });
    }
  });
};

