module.exports = function registerApiRoutes(deps) {
  // load individual route modules and pass shared dependencies
  require('./auth.cjs')(deps);
  require('./account.cjs')(deps);
  require('./create.cjs')(deps);
  require('./tags.cjs')(deps);
  require('./product.cjs')(deps);
};

