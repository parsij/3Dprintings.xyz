const { chatRequest, ensureChatUserForDbUser, ensureChatUserPocketBaseId } = require("./chatShared.cjs");
const { resolveShopLogoFromSources } = require("./sellerProfileShared.cjs");

async function ensureChatConversationContextTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_conversation_context (
      conversation_id VARCHAR(32) PRIMARY KEY,
      buyer_db_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      seller_db_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      buyer_pb_id VARCHAR(32) NOT NULL,
      seller_pb_id VARCHAR(32) NOT NULL,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_name VARCHAR(255),
      product_image TEXT,
      shop_name VARCHAR(255),
      context_type VARCHAR(16) NOT NULL DEFAULT 'shop',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chat_conversation_context_type_check
        CHECK (context_type IN ('product', 'shop'))
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_chat_context_buyer_db_id
    ON chat_conversation_context (buyer_db_id, updated_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_chat_context_seller_db_id
    ON chat_conversation_context (seller_db_id, updated_at DESC)
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS chat_context_buyer_seller_product_unique_idx
    ON chat_conversation_context (buyer_db_id, seller_db_id, COALESCE(product_id, 0))
  `);
}

async function ensureChatConversationReadsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_conversation_reads (
      conversation_id VARCHAR(32) NOT NULL,
      user_db_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (conversation_id, user_db_id)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_chat_conversation_reads_user
    ON chat_conversation_reads (user_db_id, last_read_at DESC)
  `);
}

function normalizeContextType(value) {
  return String(value || "").trim().toLowerCase() === "product" ? "product" : "shop";
}

function isValidPocketBaseId(value) {
  return /^[a-z0-9]{15}$/i.test(String(value || "").trim());
}

function sanitizeConversationIds(conversationIds) {
  if (!Array.isArray(conversationIds)) {
    return [];
  }

  return [...new Set(
    conversationIds
      .map((conversationId) => String(conversationId || "").trim())
      .filter(isValidPocketBaseId)
  )];
}

async function assertUserCanAccessConversation(pool, {
  conversationId,
  userDbId,
  userPbId,
  token,
}) {
  if (!isValidPocketBaseId(conversationId)) {
    throw Object.assign(new Error("Conversation not found."), { statusCode: 404 });
  }

  const parsedUserDbId = Number(userDbId);
  if (!Number.isInteger(parsedUserDbId) || parsedUserDbId <= 0) {
    throw Object.assign(new Error("Conversation not found."), { statusCode: 404 });
  }

  const contextResult = await pool.query(
    `SELECT 1
     FROM chat_conversation_context
     WHERE conversation_id = $1
       AND (buyer_db_id = $2 OR seller_db_id = $2)
     LIMIT 1`,
    [conversationId, parsedUserDbId]
  );

  if (contextResult.rows.length > 0) {
    return;
  }

  if (!token || !isValidPocketBaseId(userPbId)) {
    throw Object.assign(new Error("Conversation not found."), { statusCode: 404 });
  }

  try {
    const conversation = await chatRequest(
      `api/collections/conversations/records/${encodeURIComponent(conversationId)}`,
      { token }
    );

    const buyerMatches = String(conversation?.buyer || "") === String(userPbId);
    const sellerMatches = String(conversation?.seller || "") === String(userPbId);

    if (!buyerMatches && !sellerMatches) {
      throw Object.assign(new Error("Conversation not found."), { statusCode: 404 });
    }
  } catch (error) {
    if (Number(error?.statusCode) === 404 || Number(error?.status) === 404) {
      throw Object.assign(new Error("Conversation not found."), { statusCode: 404 });
    }
    throw error;
  }
}

function buildConversationPayload({
  buyerPbId,
  sellerPbId,
  productId,
  productName,
  productImage,
  shopName,
  contextType,
}) {
  const payload = {
    buyer: buyerPbId,
    seller: sellerPbId,
  };

  const normalizedType = normalizeContextType(contextType);
  const parsedProductId = Number(productId);

  if (normalizedType === "product" && Number.isInteger(parsedProductId) && parsedProductId > 0) {
    payload.product_id = parsedProductId;
    payload.context_type = "product";
    if (productName) payload.product_name = String(productName).slice(0, 255);
    if (productImage) payload.product_image = String(productImage).slice(0, 2000);
  } else {
    payload.context_type = "shop";
    payload.product_id = 0;
  }

  if (shopName) {
    payload.shop_name = String(shopName).slice(0, 255);
  }

  return payload;
}

async function createPocketBaseConversation(token, payload) {
  try {
    return await chatRequest("api/collections/conversations/records", {
      method: "POST",
      body: payload,
      token,
    });
  } catch (error) {
    const fallbackPayload = {
      buyer: payload.buyer,
      seller: payload.seller,
    };
    return chatRequest("api/collections/conversations/records", {
      method: "POST",
      body: fallbackPayload,
      token,
    });
  }
}

async function listPocketBaseConversations({ token, userPbId, mode }) {
  if (!isValidPocketBaseId(userPbId)) {
    return [];
  }

  const filter =
    mode === "seller"
      ? `seller = "${userPbId}"`
      : `buyer = "${userPbId}"`;

  const encodedFilter = encodeURIComponent(filter);
  const payload = await chatRequest(
    `api/collections/conversations/records?page=1&perPage=100&sort=-updated&filter=${encodedFilter}`,
    { token }
  );

  return Array.isArray(payload?.items) ? payload.items : [];
}

async function findExistingConversationContext(pool, {
  buyerDbId,
  sellerDbId,
  productId,
  contextType,
}) {
  const normalizedType = normalizeContextType(contextType);
  const parsedProductId = Number(productId);

  if (normalizedType === "product" && Number.isInteger(parsedProductId) && parsedProductId > 0) {
    const result = await pool.query(
      `SELECT *
       FROM chat_conversation_context
       WHERE buyer_db_id = $1
         AND seller_db_id = $2
         AND product_id = $3
       LIMIT 1`,
      [buyerDbId, sellerDbId, parsedProductId]
    );
    return result.rows[0] || null;
  }

  const result = await pool.query(
    `SELECT *
     FROM chat_conversation_context
     WHERE buyer_db_id = $1
       AND seller_db_id = $2
       AND context_type = 'shop'
     LIMIT 1`,
    [buyerDbId, sellerDbId]
  );
  return result.rows[0] || null;
}

async function upsertConversationContext(pool, {
  conversationId,
  buyerDbId,
  sellerDbId,
  buyerPbId,
  sellerPbId,
  productId,
  productName,
  productImage,
  shopName,
  contextType,
}) {
  const normalizedType = normalizeContextType(contextType);
  const parsedProductId =
    normalizedType === "product" && Number.isInteger(Number(productId)) && Number(productId) > 0
      ? Number(productId)
      : null;

  await pool.query(
    `INSERT INTO chat_conversation_context (
       conversation_id,
       buyer_db_id,
       seller_db_id,
       buyer_pb_id,
       seller_pb_id,
       product_id,
       product_name,
       product_image,
       shop_name,
       context_type,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     ON CONFLICT (conversation_id)
     DO UPDATE SET
       product_name = EXCLUDED.product_name,
       product_image = EXCLUDED.product_image,
       shop_name = EXCLUDED.shop_name,
       updated_at = NOW()`,
    [
      conversationId,
      buyerDbId,
      sellerDbId,
      buyerPbId,
      sellerPbId,
      parsedProductId,
      productName ? String(productName).slice(0, 255) : null,
      productImage ? String(productImage).slice(0, 2000) : null,
      shopName ? String(shopName).slice(0, 255) : null,
      normalizedType,
    ]
  );
}

async function loadProductContext(pool, productId) {
  const parsedProductId = Number(productId);
  if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
    return null;
  }

  const result = await pool.query(
    `SELECT p.id,
            p.name,
            p.current_price,
            p.user_id AS seller_db_id,
            p.img_path,
            sp.shop_name
     FROM products p
     LEFT JOIN seller_profiles sp ON sp.seller_user_id = p.user_id
     WHERE p.id = $1
     LIMIT 1`,
    [parsedProductId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  const firstImage = Array.isArray(row.img_path) && row.img_path.length > 0 ? row.img_path[0] : null;

  return {
    productId: row.id,
    productName: row.name,
    productPrice: row.current_price,
    productImage: firstImage,
    shopName: row.shop_name || null,
    sellerDbId: row.seller_db_id,
  };
}

async function loadSellerProfiles(pool, sellerDbIds) {
  const parsedIds = [...new Set(
    (Array.isArray(sellerDbIds) ? sellerDbIds : [])
      .map((sellerDbId) => Number(sellerDbId))
      .filter((sellerDbId) => Number.isInteger(sellerDbId) && sellerDbId > 0)
  )];

  if (!parsedIds.length) {
    return new Map();
  }

  const result = await pool.query(
    `SELECT sp.shop_name,
            sp.shop_logo_url,
            u.id,
            u.username,
            u.seller_preferences
     FROM users u
     LEFT JOIN seller_profiles sp ON sp.seller_user_id = u.id
     WHERE u.id = ANY($1::int[])`,
    [parsedIds]
  );

  return new Map(
    result.rows.map((row) => {
      const preferences =
        row.seller_preferences && typeof row.seller_preferences === "object"
          ? row.seller_preferences
          : {};

      return [
        row.id,
        {
          shopName: row.shop_name || row.username || null,
          shopLogoUrl: resolveShopLogoFromSources(row.shop_logo_url, preferences.shopLogoUrl) || null,
        },
      ];
    })
  );
}

async function loadSellerProfile(pool, sellerDbId) {
  const profiles = await loadSellerProfiles(pool, [sellerDbId]);
  return profiles.get(Number(sellerDbId)) || null;
}

async function loadLastReadMap(pool, userDbId, conversationIds) {
  if (!conversationIds.length) {
    return new Map();
  }

  const result = await pool.query(
    `SELECT conversation_id, last_read_at
     FROM chat_conversation_reads
     WHERE user_db_id = $1
       AND conversation_id = ANY($2::varchar[])`,
    [userDbId, conversationIds]
  );

  return new Map(result.rows.map((row) => [row.conversation_id, row.last_read_at]));
}

async function markConversationRead(pool, {
  conversationId,
  userDbId,
  userPbId,
  token,
}) {
  await assertUserCanAccessConversation(pool, {
    conversationId,
    userDbId,
    userPbId,
    token,
  });

  const parsedUserDbId = Number(userDbId);
  const resolvedReadAt = new Date();

  await pool.query(
    `INSERT INTO chat_conversation_reads (conversation_id, user_db_id, last_read_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (conversation_id, user_db_id)
     DO UPDATE SET last_read_at = GREATEST(chat_conversation_reads.last_read_at, EXCLUDED.last_read_at)`,
    [conversationId, parsedUserDbId, resolvedReadAt.toISOString()]
  );
}

async function countUnreadMessages(token, conversationId, userPbId, lastReadAt) {
  if (!isValidPocketBaseId(conversationId) || !isValidPocketBaseId(userPbId)) {
    return 0;
  }

  const readTimestamp = lastReadAt
    ? new Date(lastReadAt).toISOString()
    : "1970-01-01T00:00:00.000Z";

  const filter = `conversation = "${conversationId}" && senderId != "${userPbId}" && created > "${readTimestamp}"`;
  const payload = await chatRequest(
    `api/collections/messages/records?page=1&perPage=1&filter=${encodeURIComponent(filter)}`,
    { token }
  );

  return Number(payload?.totalItems) || 0;
}

async function loadLastMessageAtMap(token, conversationIds) {
  const validIds = sanitizeConversationIds(conversationIds);
  const lastMessageAtById = new Map(
    validIds.map((conversationId) => [conversationId, null])
  );

  if (!validIds.length || !token) {
    return lastMessageAtById;
  }

  const filter = validIds.map((conversationId) => `conversation = "${conversationId}"`).join(" || ");
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= 5) {
    const payload = await chatRequest(
      `api/collections/messages/records?page=${page}&perPage=500&sort=-created&filter=${encodeURIComponent(filter)}`,
      { token }
    );

    const items = Array.isArray(payload?.items) ? payload.items : [];
    totalPages = Number(payload?.totalPages) || 1;

    for (const message of items) {
      const conversationId = message?.conversation;
      if (!lastMessageAtById.has(conversationId) || lastMessageAtById.get(conversationId)) {
        continue;
      }
      lastMessageAtById.set(conversationId, message.created || null);
    }

    if (validIds.every((conversationId) => lastMessageAtById.get(conversationId))) {
      break;
    }

    page += 1;
  }

  return lastMessageAtById;
}

async function loadConversationMessageStats(token, conversationIds, userPbId, lastReadMap) {
  const validIds = sanitizeConversationIds(conversationIds);
  const statsById = new Map(
    validIds.map((conversationId) => [
      conversationId,
      { lastMessageAt: null, unreadCount: 0 },
    ])
  );

  if (!validIds.length || !token || !isValidPocketBaseId(userPbId)) {
    return statsById;
  }

  const lastMessageAtById = await loadLastMessageAtMap(token, validIds);
  const unreadCounts = await Promise.all(
    validIds.map(async (conversationId) => {
      try {
        const unreadCount = await countUnreadMessages(
          token,
          conversationId,
          userPbId,
          lastReadMap.get(conversationId)
        );
        return [conversationId, unreadCount];
      } catch (error) {
        console.error("Failed to count unread chat messages:", error?.message || error);
        return [conversationId, 0];
      }
    })
  );

  for (const [conversationId, unreadCount] of unreadCounts) {
    statsById.set(conversationId, {
      lastMessageAt: lastMessageAtById.get(conversationId) || null,
      unreadCount,
    });
  }

  return statsById;
}

function mergeConversationRecord(pbConversation, contextRow, extras = {}) {
  const contextType = contextRow?.context_type || pbConversation?.context_type || "shop";
  const shopName = contextRow?.shop_name || pbConversation?.shop_name || extras.shopName || null;

  return {
    id: pbConversation.id,
    buyer: pbConversation.buyer,
    seller: pbConversation.seller,
    created: pbConversation.created,
    updated: pbConversation.updated,
    contextType,
    productId: contextRow?.product_id || pbConversation?.product_id || null,
    productName: contextRow?.product_name || pbConversation?.product_name || extras.productName || null,
    productImage: contextRow?.product_image || pbConversation?.product_image || extras.productImage || null,
    productPrice: extras.productPrice ?? null,
    shopName,
    shopLogoUrl: extras.shopLogoUrl || null,
    buyerDbId: contextRow?.buyer_db_id || null,
    sellerDbId: contextRow?.seller_db_id || extras.sellerDbId || null,
    otherParticipantLabel: extras.otherParticipantLabel || null,
    title: extras.title || null,
    subtitle: extras.subtitle ?? null,
    lastMessageAt: extras.lastMessageAt || pbConversation.updated || pbConversation.created,
    unreadCount: Number.isFinite(Number(extras.unreadCount)) ? Number(extras.unreadCount) : 0,
  };
}

async function enrichConversationRows(pool, pbConversations, {
  mode,
  currentUserDbId,
  token,
  userPbId,
}) {
  if (!pbConversations.length) {
    return [];
  }

  const ids = pbConversations.map((conversation) => conversation.id);
  const contextResult = await pool.query(
    `SELECT *
     FROM chat_conversation_context
     WHERE conversation_id = ANY($1::varchar[])`,
    [ids]
  );
  const contextById = new Map(contextResult.rows.map((row) => [row.conversation_id, row]));
  const sellerProfilesById = await loadSellerProfiles(
    pool,
    contextResult.rows.map((row) => row.seller_db_id)
  );
  const lastReadMap = await loadLastReadMap(pool, currentUserDbId, ids);
  const messageStatsById = await loadConversationMessageStats(token, ids, userPbId, lastReadMap);

  const enriched = [];

  for (const pbConversation of pbConversations) {
    const contextRow = contextById.get(pbConversation.id) || null;
    let extras = {};
    const messageStats = messageStatsById.get(pbConversation.id) || {
      lastMessageAt: null,
      unreadCount: 0,
    };

    extras.lastMessageAt = messageStats.lastMessageAt;
    extras.unreadCount = messageStats.unreadCount;

    const sellerDbId = contextRow?.seller_db_id || null;

    if (sellerDbId) {
      const sellerProfile = sellerProfilesById.get(Number(sellerDbId)) || null;
      extras.sellerDbId = sellerDbId;
      extras.shopName = contextRow?.shop_name || sellerProfile?.shopName || null;
      extras.shopLogoUrl = sellerProfile?.shopLogoUrl || null;
    }

    if (contextRow?.product_id) {
      const product = await loadProductContext(pool, contextRow.product_id);
      if (product) {
        extras = {
          ...extras,
          productName: product.productName,
          productImage: product.productImage,
          productPrice: product.productPrice,
          shopName: product.shopName || extras.shopName,
          sellerDbId: product.sellerDbId,
        };

        if (!extras.shopLogoUrl && product.sellerDbId) {
          const productSellerProfile = sellerProfilesById.get(Number(product.sellerDbId))
            || await loadSellerProfile(pool, product.sellerDbId);
          extras.shopLogoUrl = productSellerProfile?.shopLogoUrl || null;
        }
      }
    }

    const isSellerView = mode === "seller";
    const shopLabel = extras.shopName || contextRow?.shop_name || "Shop";
    const productLabel = extras.productName || contextRow?.product_name;
    const isProductContext = contextRow?.context_type === "product" && productLabel;

    if (isSellerView) {
      extras.title = productLabel || "Buyer inquiry";
      extras.subtitle = productLabel ? shopLabel : "";
      extras.otherParticipantLabel = "Buyer";
    } else if (isProductContext) {
      extras.title = productLabel;
      extras.subtitle = `by ${shopLabel}`;
      extras.otherParticipantLabel = shopLabel;
    } else {
      extras.title = shopLabel;
      extras.subtitle = "";
      extras.otherParticipantLabel = shopLabel;
    }

    enriched.push(mergeConversationRecord(pbConversation, contextRow, extras));
  }

  return enriched.sort((left, right) =>
    String(right.lastMessageAt || right.updated || "").localeCompare(
      String(left.lastMessageAt || left.updated || "")
    )
  );
}

async function startConversation(pool, {
  buyerUser,
  sellerDbId,
  productId,
  contextType,
  productName,
  productImage,
  shopName,
}) {
  const buyerDbId = Number(buyerUser.id);
  const parsedSellerDbId = Number(sellerDbId);

  if (!Number.isInteger(buyerDbId) || buyerDbId <= 0) {
    throw Object.assign(new Error("Sign in before messaging a shop."), { statusCode: 401 });
  }

  if (!Number.isInteger(parsedSellerDbId) || parsedSellerDbId <= 0) {
    throw Object.assign(new Error("This shop is not available for messages yet."), { statusCode: 400 });
  }

  if (buyerDbId === parsedSellerDbId) {
    throw Object.assign(new Error("You cannot message your own shop."), { statusCode: 400 });
  }

  const buyerSession = await ensureChatUserForDbUser(pool, buyerUser);
  const sellerPbId = await ensureChatUserPocketBaseId(pool, parsedSellerDbId);

  if (!sellerPbId) {
    throw Object.assign(new Error("This shop is not available for messages yet."), { statusCode: 400 });
  }

  const normalizedType = normalizeContextType(contextType);
  let resolvedProduct = null;

  if (normalizedType === "product") {
    resolvedProduct = await loadProductContext(pool, productId);
    if (!resolvedProduct || Number(resolvedProduct.sellerDbId) !== parsedSellerDbId) {
      throw Object.assign(new Error("This product is not available for messages."), { statusCode: 404 });
    }
  }

  const sellerProfile = await loadSellerProfile(pool, parsedSellerDbId);
  const resolvedShopName = resolvedProduct?.shopName || sellerProfile?.shopName || "Shop";

  const existingContext = await findExistingConversationContext(pool, {
    buyerDbId,
    sellerDbId: parsedSellerDbId,
    productId: resolvedProduct?.productId || productId,
    contextType: normalizedType,
  });

  if (existingContext?.conversation_id) {
    return {
      conversationId: existingContext.conversation_id,
      created: false,
    };
  }

  const payload = buildConversationPayload({
    buyerPbId: buyerSession.pocketbaseId,
    sellerPbId,
    productId: resolvedProduct?.productId || null,
    productName: resolvedProduct?.productName || null,
    productImage: resolvedProduct?.productImage || null,
    shopName: resolvedShopName,
    contextType: normalizedType,
  });

  const pbConversation = await createPocketBaseConversation(buyerSession.token, payload);
  if (!pbConversation?.id) {
    throw Object.assign(new Error("Unable to start this conversation."), { statusCode: 500 });
  }

  await upsertConversationContext(pool, {
    conversationId: pbConversation.id,
    buyerDbId,
    sellerDbId: parsedSellerDbId,
    buyerPbId: buyerSession.pocketbaseId,
    sellerPbId,
    productId: resolvedProduct?.productId || null,
    productName: resolvedProduct?.productName || null,
    productImage: resolvedProduct?.productImage || null,
    shopName: resolvedShopName,
    contextType: normalizedType,
  });

  return {
    conversationId: pbConversation.id,
    created: true,
  };
}

async function listConversationsForAccount(pool, buyerUser, mode = "customer") {
  const session = await ensureChatUserForDbUser(pool, buyerUser);
  const pbConversations = await listPocketBaseConversations({
    token: session.token,
    userPbId: session.pocketbaseId,
    mode: mode === "seller" ? "seller" : "customer",
  });

  return enrichConversationRows(pool, pbConversations, {
    mode,
    currentUserDbId: buyerUser.id,
    token: session.token,
    userPbId: session.pocketbaseId,
  });
}

module.exports = {
  ensureChatConversationContextTable,
  ensureChatConversationReadsTable,
  enrichConversationRows,
  listConversationsForAccount,
  markConversationRead,
  startConversation,
};
