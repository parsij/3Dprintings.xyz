const { enqueueWrite } = require('../asyncDb.cjs');

module.exports = function registerApiRoutes(deps) {
  const routeDeps = { ...deps, enqueueWrite };
  // load individual route modules and pass shared dependencies
  require('./auth.cjs')(routeDeps);
  require('./account.cjs')(routeDeps);
  require('./create.cjs')(routeDeps);
  require('./tags.cjs')(routeDeps);
  require('./product.cjs')(routeDeps);
  require('./reviews.cjs')(routeDeps);
  require('./cart.cjs')(routeDeps);
  require('./likes.cjs')(routeDeps);
  require('./payment.cjs')(routeDeps);
  require('./config.cjs')(routeDeps);
  require('./seller.cjs')(routeDeps);
};
