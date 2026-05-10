let ensureLikesColumnsPromise = null;

function normalizeNumericArray(rawValue) {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  return rawValue
    .map((value) => parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function toggleNumericId(rawValue, targetId) {
  const normalizedIds = normalizeNumericArray(rawValue);
  const isToggledOn = normalizedIds.includes(targetId);

  if (isToggledOn) {
    return {
      isActive: false,
      ids: normalizedIds.filter((id) => id !== targetId),
    };
  }

  return {
    isActive: true,
    ids: [...normalizedIds, targetId],
  };
}

async function ensureLikesColumns(pool) {
  if (!ensureLikesColumnsPromise) {
    ensureLikesColumnsPromise = pool
      .query(
        `ALTER TABLE users
         ADD COLUMN IF NOT EXISTS liked_products JSONB NOT NULL DEFAULT '[]'::jsonb,
         ADD COLUMN IF NOT EXISTS saved_products JSONB NOT NULL DEFAULT '[]'::jsonb,
         ADD COLUMN IF NOT EXISTS liked_reviews JSONB NOT NULL DEFAULT '[]'::jsonb`
      )
      .catch((error) => {
        ensureLikesColumnsPromise = null;
        throw error;
      });
  }

  return ensureLikesColumnsPromise;
}

module.exports = {
  ensureLikesColumns,
  normalizeNumericArray,
  toggleNumericId,
};