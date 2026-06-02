async function up(knex) {
  const exists = await knex.schema.hasTable("utm_presets");
  if (exists) return;

  await knex.schema.createTable("utm_presets", table => {
    table.increments("id");
    table.integer("user_id").references("users.id").onDelete("CASCADE").notNullable();
    table.string("name").notNullable();
    table.string("utm_source").defaultTo("");
    table.string("utm_medium").defaultTo("");
    table.string("utm_campaign").defaultTo("");
    table.string("utm_content").defaultTo("");
    table.string("utm_term").defaultTo("");
    table.boolean("is_campaign_history").defaultTo(false);
    table.timestamps(true, true);
  });
}

async function down(knex) {
  await knex.schema.dropTableIfExists("utm_presets");
}

module.exports = { up, down };
