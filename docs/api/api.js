
const p = require("../../package.json");
const env = require("../../server/env");

const protocol = env.isDev ? "http://" : "https://";

module.exports = {
  openapi: "3.0.0",
  info: {
    title: env.SITE_NAME + " API",
    description: `API reference for ${protocol}${env.DEFAULT_DOMAIN}\n\n**Authentication:** use the \`X-Api-Key\` header with your API key (found in Settings).\n`,
    version: p.version
  },
  servers: [
    {
      url: `${protocol}${env.DEFAULT_DOMAIN}/api/v2`,
      description: "Production"
    }
  ],
  tags: [
    { name: "health" },
    { name: "links" },
    { name: "stats" },
    { name: "domains" },
    { name: "users" }
  ],
  paths: {
    "/health": {
      get: {
        tags: ["health"],
        summary: "API health",
        responses: {
          "200": {
            description: "Health",
            content: {
              "text/html": {
                example: "OK"
              }
            }
          }
        }
      }
    },
    "/links": {
      get: {
        tags: ["links"],
        description: "Get list of links",
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Limit",
            required: false,
            style: "form",
            explode: true,
            schema: {
              type: "number",
              example: 10
            }
          },
          {
            name: "skip",
            in: "query",
            description: "Skip",
            required: false,
            style: "form",
            explode: true,
            schema: {
              type: "number",
              example: 0
            }
          },
          {
            name: "all",
            in: "query",
            description: "All links (ADMIN only)",
            required: false,
            style: "form",
            explode: true,
            schema: {
              type: "boolean",
              example: false
            }
          }
        ],
        responses: {
          "200": {
            description: "List of links",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/inline_response_200"
                }
              }
            }
          }
        },
        security: [
          {
            APIKeyAuth: []
          }
        ]
      },
      post: {
        tags: ["links"],
        description: "Create a short link",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/body"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Created link",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Link"
                }
              }
            }
          }
        },
        security: [
          {
            APIKeyAuth: []
          }
        ]
      }
    },
    "/links/{id}": {
      delete: {
        tags: ["links"],
        description: "Delete a link",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            style: "simple",
            explode: false,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Deleted link successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/inline_response_200_1"
                }
              }
            }
          }
        },
        security: [
          {
            APIKeyAuth: []
          }
        ]
      },
      patch: {
        tags: ["links"],
        description: "Update a link",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            style: "simple",
            explode: false,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/body_1"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Updated link successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Link"
                }
              }
            }
          }
        },
        security: [
          {
            APIKeyAuth: []
          }
        ]
      }
    },
    "/links/bulk": {
      post: {
        tags: ["links"],
        description: "Create up to 50 links in a single request",
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BulkCreateBody" },
              example: {
                links: [
                  { target: "https://example.com", description: "Example" },
                  { target: "https://github.com", customurl: "gh" }
                ]
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Bulk create result",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BulkCreateResponse" }
              }
            }
          }
        },
        security: [{ APIKeyAuth: [] }]
      }
    },
    "/links/export": {
      get: {
        tags: ["links"],
        description: "Export all links as CSV or JSON",
        parameters: [
          {
            name: "format",
            in: "query",
            description: "Export format",
            required: false,
            schema: { type: "string", enum: ["csv", "json"], default: "csv" }
          }
        ],
        responses: {
          "200": {
            description: "File download (CSV or JSON)",
            content: {
              "text/csv": { schema: { type: "string" } },
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Link" } }
              }
            }
          }
        },
        security: [{ APIKeyAuth: [] }]
      }
    },
    "/links/{id}/stats": {
      get: {
        tags: ["links"],
        description: "Get stats for a specific link. Use `from` and `to` to filter by date range.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            style: "simple",
            explode: false,
            schema: { type: "string", format: "uuid" }
          },
          {
            name: "from",
            in: "query",
            description: "Start date (ISO 8601)",
            required: false,
            schema: { type: "string", format: "date", example: "2024-01-01" }
          },
          {
            name: "to",
            in: "query",
            description: "End date (ISO 8601)",
            required: false,
            schema: { type: "string", format: "date", example: "2024-12-31" }
          }
        ],
        responses: {
          "200": {
            description: "Link stats",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Stats" }
              }
            }
          }
        },
        security: [{ APIKeyAuth: [] }]
      }
    },
    "/stats": {
      get: {
        tags: ["stats"],
        description: "Get global stats for the authenticated user: total links, total clicks, and top 5 links.",
        responses: {
          "200": {
            description: "Global stats",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/GlobalStats" }
              }
            }
          }
        },
        security: [{ APIKeyAuth: [] }]
      }
    },
    "/domains": {
      post: {
        tags: ["domains"],
        description: "Create a domain",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/body_2"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Created domain",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Domain"
                }
              }
            }
          }
        },
        security: [
          {
            APIKeyAuth: []
          }
        ]
      }
    },
    "/domains/{id}": {
      delete: {
        tags: ["domains"],
        description: "Delete a domain",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            style: "simple",
            explode: false,
            schema: {
              type: "string",
              format: "uuid"
            }
          }
        ],
        responses: {
          "200": {
            description: "Deleted domain successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/inline_response_200_1"
                }
              }
            }
          }
        },
        security: [
          {
            APIKeyAuth: []
          }
        ]
      }
    },
    "/users": {
      get: {
        tags: ["users"],
        description: "Get user info",
        responses: {
          "200": {
            description: "User info",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/User"
                }
              }
            }
          }
        },
        security: [
          {
            APIKeyAuth: []
          }
        ]
      }
    }
  },
  components: {
    schemas: {
      Link: {
        type: "object",
        properties: {
          address: {
            type: "string"
          },
          banned: {
            type: "boolean",
            default: false
          },
          created_at: {
            type: "string",
            format: "date-time"
          },
          id: {
            type: "string",
            format: "uuid"
          },
          link: {
            type: "string"
          },
          password: {
            type: "boolean",
            default: false
          },
          target: {
            type: "string"
          },
          description: {
            type: "string"
          },
          updated_at: {
            type: "string",
            format: "date-time"
          },
          visit_count: {
            type: "number"
          }
        }
      },
      Domain: {
        type: "object",
        properties: {
          address: {
            type: "string"
          },
          banned: {
            type: "boolean",
            default: false
          },
          created_at: {
            type: "string",
            format: "date-time"
          },
          id: {
            type: "string",
            format: "uuid"
          },
          homepage: {
            type: "string"
          },
          updated_at: {
            type: "string",
            format: "date-time"
          }
        }
      },
      User: {
        type: "object",
        properties: {
          apikey: {
            type: "string"
          },
          email: {
            type: "string"
          },
          domains: {
            type: "array",
            items: {
              $ref: "#/components/schemas/Domain"
            }
          }
        }
      },
      StatsItem: {
        type: "object",
        properties: {
          stats: {
            $ref: "#/components/schemas/StatsItem_stats"
          },
          views: {
            type: "array",
            items: {
              type: "number"
            }
          }
        }
      },
      Stats: {
        type: "object",
        properties: {
          lastDay: {
            $ref: "#/components/schemas/StatsItem"
          },
          lastMonth: {
            $ref: "#/components/schemas/StatsItem"
          },
          lastWeek: {
            $ref: "#/components/schemas/StatsItem"
          },
          lastYear: {
            $ref: "#/components/schemas/StatsItem"
          },
          updatedAt: {
            type: "string"
          },
          address: {
            type: "string"
          },
          banned: {
            type: "boolean",
            default: false
          },
          created_at: {
            type: "string",
            format: "date-time"
          },
          id: {
            type: "string",
            format: "uuid"
          },
          link: {
            type: "string"
          },
          password: {
            type: "boolean",
            default: false
          },
          target: {
            type: "string"
          },
          updated_at: {
            type: "string",
            format: "date-time"
          },
          visit_count: {
            type: "number"
          }
        }
      },
      inline_response_200: {
        properties: {
          limit: {
            type: "number",
            default: 10
          },
          skip: {
            type: "number",
            default: 0
          },
          total: {
            type: "number",
            default: 0
          },
          data: {
            type: "array",
            items: {
              $ref: "#/components/schemas/Link"
            }
          }
        }
      },
      body: {
        required: ["target"],
        properties: {
          target: {
            type: "string"
          },
          description: {
            type: "string"
          },
          expire_in: {
            type: "string",
            example: "2 minutes/hours/days"
          },
          password: {
            type: "string"
          },
          customurl: {
            type: "string"
          },
          reuse: {
            type: "boolean",
            default: false
          },
          domain: {
            type: "string"
          }
        }
      },
      inline_response_200_1: {
        properties: {
          message: {
            type: "string"
          }
        }
      },
      body_1: {
        required: ["target", "address"],
        properties: {
          target: {
            type: "string"
          },
          address: {
            type: "string"
          },
          description: {
            type: "string"
          },
          expire_in: {
            type: "string",
            example: "2 minutes/hours/days"
          }
        }
      },
      body_2: {
        required: ["address"],
        properties: {
          address: {
            type: "string"
          },
          homepage: {
            type: "string"
          }
        }
      },
      StatsItem_stats_browser: {
        type: "object",
        properties: {
          name: {
            type: "string"
          },
          value: {
            type: "number"
          }
        }
      },
      StatsItem_stats: {
        type: "object",
        properties: {
          browser: {
            type: "array",
            items: {
              $ref: "#/components/schemas/StatsItem_stats_browser"
            }
          },
          os: {
            type: "array",
            items: {
              $ref: "#/components/schemas/StatsItem_stats_browser"
            }
          },
          country: {
            type: "array",
            items: {
              $ref: "#/components/schemas/StatsItem_stats_browser"
            }
          },
          referrer: {
            type: "array",
            items: {
              $ref: "#/components/schemas/StatsItem_stats_browser"
            }
          }
        }
      }
    },
      BulkCreateBody: {
        type: "object",
        required: ["links"],
        properties: {
          links: {
            type: "array",
            maxItems: 50,
            items: {
              type: "object",
              required: ["target"],
              properties: {
                target: { type: "string" },
                description: { type: "string" },
                customurl: { type: "string" }
              }
            }
          }
        }
      },
      BulkCreateResponse: {
        type: "object",
        properties: {
          created: { type: "number" },
          errors: { type: "number" },
          data: { type: "array", items: { $ref: "#/components/schemas/Link" } },
          error_details: {
            type: "array",
            items: {
              type: "object",
              properties: {
                target: { type: "string" },
                error: { type: "string" }
              }
            }
          }
        }
      },
      GlobalStats: {
        type: "object",
        properties: {
          total_links: { type: "number" },
          total_clicks: { type: "number" },
          top_links: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                address: { type: "string" },
                target: { type: "string" },
                description: { type: "string" },
                visit_count: { type: "number" },
                link: { type: "string" }
              }
            }
          }
        }
      }
    },
    securitySchemes: {
      APIKeyAuth: {
        type: "apiKey",
        name: "X-Api-Key",
        in: "header"
      }
    }
  }
};
