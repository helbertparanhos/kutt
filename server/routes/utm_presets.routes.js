const { Router } = require("express");

const asyncHandler = require("../utils/asyncHandler");
const auth = require("../handlers/auth.handler");
const query = require("../queries");

const router = Router();

router.get(
  "/",
  asyncHandler(auth.apikey),
  asyncHandler(auth.jwt),
  asyncHandler(async (req, res) => {
    const [presets, history] = await Promise.all([
      query.utm_presets.list(req.user.id),
      query.utm_presets.campaignHistory(req.user.id),
    ]);
    return res.json({ presets, campaign_history: history.map(h => h.name) });
  })
);

router.post(
  "/",
  asyncHandler(auth.apikey),
  asyncHandler(auth.jwt),
  asyncHandler(async (req, res) => {
    const { name, utm_source, utm_medium, utm_campaign, utm_content, utm_term } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required." });
    }
    const preset = await query.utm_presets.create({
      user_id: req.user.id,
      name: name.trim(),
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    });
    return res.status(201).json(preset);
  })
);

router.post(
  "/campaigns",
  asyncHandler(auth.apikey),
  asyncHandler(auth.jwt),
  asyncHandler(async (req, res) => {
    const { campaign } = req.body;
    if (!campaign || !campaign.trim()) return res.status(400).json({ error: "Campaign is required." });
    await query.utm_presets.upsertCampaign(req.user.id, campaign.trim());
    return res.json({ ok: true });
  })
);

router.get(
  "/settings-partial",
  asyncHandler(auth.jwt),
  asyncHandler(async (req, res) => {
    const presets = await query.utm_presets.list(req.user.id);
    if (!presets.length) {
      return res.send("<p class='utm-hint'>No presets yet. Create one below.</p>");
    }
    const rows = presets.map(p => `
      <div class="utm-preset-row">
        <div class="utm-preset-info">
          <strong>${p.name}</strong>
          <span class="utm-hint">
            ${[p.utm_source, p.utm_medium, p.utm_campaign, p.utm_content].filter(Boolean).join(" · ")}
          </span>
        </div>
        <button type="button" class="button danger small" onclick="deleteUtmPreset(${p.id})">Delete</button>
      </div>`).join("");
    return res.send(`<div class="utm-presets-settings">${rows}</div>`);
  })
);

router.delete(
  "/:id",
  asyncHandler(auth.apikey),
  asyncHandler(auth.jwt),
  asyncHandler(async (req, res) => {
    await query.utm_presets.remove(req.params.id, req.user.id);
    return res.json({ message: "Preset deleted." });
  })
);

module.exports = router;
