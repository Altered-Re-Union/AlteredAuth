// One-shot cleanup: turn the raw prod export into a dev seed.
// Run: node dev/clean.js
const fs = require("fs");
const path = require("path");

const INPUT = path.join(__dirname, "realm-export-raw.json");
const OUTPUT = path.join(__dirname, "realm-export.json");

// Keycloak's built-in clients (kept so the account console etc. work out of the
// box) plus the dev-only example client.
const KEPT_CLIENTS = new Set([
  "account",
  "account-console",
  "admin-cli",
  "broker",
  "realm-management",
  "security-admin-console",
  "localhost-test",
  "ownership-frontend"
]);

const TEST_USERS = [
  {
    username: "alice",
    email: "alice@example.test",
    firstName: "Alice",
    lastName: "Tester",
    enabled: true,
    emailVerified: true,
    credentials: [{ type: "password", value: "TestPassword1234", temporary: false }],
  },
  {
    username: "bob",
    email: "bob@example.test",
    firstName: "Bob",
    lastName: "Tester",
    enabled: true,
    emailVerified: true,
    credentials: [{ type: "password", value: "TestPassword1234", temporary: false }],
  },
];

// Recursively strip every "id" field so Keycloak regenerates fresh UUIDs on import.
function stripIds(node) {
  if (Array.isArray(node)) return node.map(stripIds);
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "id" || k === "containerId") continue;
      out[k] = stripIds(v);
    }
    return out;
  }
  return node;
}

const raw = JSON.parse(fs.readFileSync(INPUT, "utf8"));

// Drop prod application clients; keep built-ins + the dev example.
raw.clients = (raw.clients || []).filter((c) => KEPT_CLIENTS.has(c.clientId));

// Drop built-in auth flows & authenticator configs (Keycloak recreates them).
raw.authenticationFlows = (raw.authenticationFlows || []).filter((f) => !f.builtIn);
if (raw.authenticationFlows.length === 0) delete raw.authenticationFlows;
delete raw.authenticatorConfig;

// Drop role definitions for the prod clients we just stripped.
if (raw.roles && raw.roles.client) {
  for (const name of Object.keys(raw.roles.client)) {
    if (!KEPT_CLIENTS.has(name)) delete raw.roles.client[name];
  }
}

// No SMTP in dev (no real mail server, no leaking prod provider).
delete raw.smtpServer;

// Dev default: skip email verification so register flow works without SMTP.
raw.verifyEmail = false;

// Seed two pre-verified test users.
raw.users = [...(raw.users || []), ...TEST_USERS];

const cleaned = stripIds(raw);

fs.writeFileSync(OUTPUT, JSON.stringify(cleaned, null, 2) + "\n");
console.log(`Wrote ${OUTPUT} (${fs.statSync(OUTPUT).size} bytes)`);
