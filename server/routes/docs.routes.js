const { Router } = require("express");

const spec = require("../../docs/api/api");

const router = Router();

router.get("/spec", (req, res) => {
  res.json(spec);
});

router.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>${spec.info.title} — API Docs</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>body { margin: 0; padding: 0; }</style>
</head>
<body>
  <redoc spec-url="/api/docs/spec" expand-responses="200,201"></redoc>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>`);
});

module.exports = router;
