const { chatRequest, ensureChatUserForDbUser, ensureChatUserPocketBaseId } = require("./chatShared.cjs");

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

function normalizeContextType(value) {
  return String(value || "").trim().toLowerCase() === "product" ? "product" : "shop";
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

async function loadShopName(pool, sellerDbId) {
  const parsedSellerDbId = Number(sellerDbId);
  if (!Number.isInteger(parsedSellerDbId) || parsedSellerDbId <= 0) {
    return null;
  }

  const result = await pool.query(
    `SELECT sp.shop_name, u.username
     FROM users u
     LEFT JOIN seller_profiles sp ON sp.seller_user_id = u.id
     WHERE u.id = $1
     LIMIT 1`,
    [parsedSellerDbId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].shop_name || result.rows[0].username || null;
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
    buyerDbId: contextRow?.buyer_db_id || null,
    sellerDbId: contextRow?.seller_db_id || extras.sellerDbId || null,
    otherParticipantLabel: extras.otherParticipantLabel || null,
    title: extras.title || null,
    subtitle: extras.subtitle || null,
  };
}

async function enrichConversationRows(pool, pbConversations, { mode, currentUserDbId }) {
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

  const enriched = [];

  for (const pbConversation of pbConversations) {
    const contextRow = contextById.get(pbConversation.id) || null;
    let extras = {};

    if (contextRow?.product_id) {
      const product = await loadProductContext(pool, contextRow.product_id);
      if (product) {
        extras = {
          productName: product.productName,
          productImage: product.productImage,
          productPrice: product.productPrice,
          shopName: product.shopName || contextRow.shop_name,
          sellerDbId: product.sellerDbId,
        };
      }
    } else if (contextRow?.seller_db_id) {
      extras.shopName = contextRow.shop_name || await loadShopName(pool, contextRow.seller_db_id);
      extras.sellerDbId = contextRow.seller_db_id;
    }

    const isSellerView = mode === "seller";
    const shopLabel = extras.shopName || contextRow?.shop_name || "Shop";
    const productLabel = extras.productName || contextRow?.product_name;

    if (isSellerView) {
      extras.title = productLabel || `Buyer inquiry`;
      extras.subtitle = productLabel ? shopLabel : "General shop message";
      extras.otherParticipantLabel = "Buyer";
    } else if (contextRow?.context_type === "product" && productLabel) {
      extras.title = productLabel;
      extras.subtitle = `${shopLabel} shop`;
      extras.otherParticipantLabel = shopLabel;
    } else {
      extras.title = `${shopLabel} shop`;
      extras.subtitle = "Shop conversation";
      extras.otherParticipantLabel = shopLabel;
    }

    enriched.push(mergeConversationRecord(pbConversation, contextRow, extras));
  }

  return enriched.sort((left, right) =>
    String(right.updated || "").localeCompare(String(left.updated || ""))
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

  const resolvedShopName =
    shopName
    || resolvedProduct?.shopName
    || await loadShopName(pool, parsedSellerDbId)
    || "Shop";

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
    productId: resolvedProduct?.productId || productId,
    productName: resolvedProduct?.productName || productName,
    productImage: resolvedProduct?.productImage || productImage,
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
    productName: resolvedProduct?.productName || productName,
    productImage: resolvedProduct?.productImage || productImage,
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
  });
}

module.exports = {
  ensureChatConversationContextTable,
  enrichConversationRows,
  listConversationsForAccount,
  startConversation,
};
