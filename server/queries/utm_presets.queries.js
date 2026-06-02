const knex = require("../knex");

async function list(userId) {
  return knex("utm_presets")
    .where({ user_id: userId, is_campaign_history: false })
    .orderBy("created_at", "desc");
}

async function campaignHistory(userId, limit = 10) {
  return knex("utm_presets")
    .where({ user_id: userId, is_campaign_history: true })
    .orderBy("updated_at", "desc")
    .limit(limit);
}

async function create(params) {
  const [row] = await knex("utm_presets").insert({
    user_id: params.user_id,
    name: params.name,
    utm_source: params.utm_source || "",
    utm_medium: params.utm_medium || "",
    utm_campaign: params.utm_campaign || "",
    utm_content: params.utm_content || "",
    utm_term: params.utm_term || "",
    is_campaign_history: params.is_campaign_history || false,
  }, "*");

  if (typeof row === "number") {
    return knex("utm_presets").where("id", row).first();
  }
  return row;
}

async function upsertCampaign(userId, campaignName) {
  const existing = await knex("utm_presets")
    .where({ user_id: userId, name: campaignName, is_campaign_history: true })
    .first();

  if (existing) {
    await knex("utm_presets")
      .where({ id: existing.id })
      .update({ updated_at: knex.fn.now() });
    return existing;
  }

  // keep only last 20 campaign history entries
  const count = await knex("utm_presets")
    .where({ user_id: userId, is_campaign_history: true })
    .count("* as c")
    .first();

  if (parseInt(count.c) >= 20) {
    const oldest = await knex("utm_presets")
      .where({ user_id: userId, is_campaign_history: true })
      .orderBy("updated_at", "asc")
      .first();
    if (oldest) await knex("utm_presets").where({ id: oldest.id }).delete();
  }

  return create({ user_id: userId, name: campaignName, utm_campaign: campaignName, is_campaign_history: true });
}

async function remove(id, userId) {
  return knex("utm_presets").where({ id, user_id: userId, is_campaign_history: false }).delete();
}

module.exports = { list, campaignHistory, create, upsertCampaign, remove };
