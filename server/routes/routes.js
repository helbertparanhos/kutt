const { Router } = require("express");

const helpers = require("./../handlers/helpers.handler");
const locals = require("./../handlers/locals.handler");
const asyncHandler = require("./../utils/asyncHandler");
const renders = require("./renders.routes");
const domains = require("./domain.routes");
const health = require("./health.routes");
const link = require("./link.routes");
const user = require("./user.routes");
const auth = require("./auth.routes");
const docs = require("./docs.routes");
const utmPresets = require("./utm_presets.routes");
const linkHandler = require("./../handlers/links.handler");
const authHandler = require("./../handlers/auth.handler");

const renderRouter = Router();
renderRouter.use(renders);

const apiRouter = Router();
apiRouter.use(locals.noLayout);
apiRouter.use("/docs", docs);
apiRouter.use("/utm-presets", utmPresets);
apiRouter.use("/domains", domains);
apiRouter.use("/health", health);
apiRouter.use("/links", link);
apiRouter.use("/users", user);
apiRouter.use("/auth", auth);

apiRouter.get(
  "/stats",
  asyncHandler(authHandler.apikey),
  asyncHandler(authHandler.jwt),
  asyncHandler(linkHandler.globalStats)
);

module.exports = {
  api: apiRouter,
  render: renderRouter,
};
