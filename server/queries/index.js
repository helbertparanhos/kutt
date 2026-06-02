const domain = require("./domain.queries");
const visit = require("./visit.queries");
const link = require("./link.queries");
const user = require("./user.queries");
const host = require("./host.queries");
const utm_presets = require("./utm_presets.queries");

module.exports = {
  domain,
  host,
  link,
  user,
  visit,
  utm_presets
};
