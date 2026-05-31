// One-shot cleanup: turn the raw prod export into a dev seed.
// Run: node dev/clean.js
const fs = require("fs");
const path = require("path");

const INPUT = path.join(__dirname, "realm-export-raw.json");
const OUTPUT = path.join(__dirname, "realm-export.json");

// Application clients kept from the prod export, with their redirect URIs / web
// origins / secret overridden to local values for the "altered-dev-environment"
// stack. Add an entry here to expose another app's client locally — start from
// the values in realm-export-raw.json and just swap the URLs.
const CLIENT_OVERRIDES = {
  // Used by altered-core-decks-api (KEYCLOAK_CLIENT_ID) and the deckbuilder.
  // directAccessGrants enabled so we can mint tokens locally via password grant.
  "toxicity-deckbuilder": {
    secret: "dev-toxicity-deckbuilder-secret",
    directAccessGrantsEnabled: true,
    redirectUris: [
      "http://decks.altered.local.gd:8001/*",
      "http://localhost:8001/*",
    ],
    webOrigins: [
      "+",
    ],
  },
  // Used by AlteredOwnership (Keycloak__ClientId). Confidential client; the SPA's
  // server-side OIDC code flow runs in the .NET server. The callback path is
  // /api/auth/callback (signout /api/auth/signout-callback) — wildcard covers both.
  // Reached in the altered-dev-environment stack on host port 8003.
  "ownership-frontend": {
    secret: "preprod-ownership-frontend-secret",
    redirectUris: [
      "http://ownership.altered.local.gd:8003/*",
      "http://localhost:8003/*",
    ],
    webOrigins: [
      "+",
    ],
  },
  // Used by alteredcore-website (config.local.php KC_CLIENT_ID). Confidential
  // client; the site runs the auth-code + token exchange server-side. The
  // callback path is /auth/keycloak-callback.php and logout posts back to "/".
  // `attributes` is merged (not replaced), so only post.logout.redirect.uris is
  // swapped from the prod value to the local one ("+" = reuse the redirect URIs).
  "main-site": {
    secret: "dev-main-site-secret",
    redirectUris: [
      "http://website.altered.local.gd:18181/*",
      "http://localhost:18181/*",
    ],
    webOrigins: [
      "+",
    ],
    attributes: {
      "post.logout.redirect.uris": "+",
    },
  },
};

// Keycloak's built-in clients (kept so the account console etc. work out of the
// box) plus the dev-only example client and the application clients above.
const KEPT_CLIENTS = new Set([
  "account",
  "account-console",
  "admin-cli",
  "broker",
  "realm-management",
  "security-admin-console",
  "localhost-test",
  ...Object.keys(CLIENT_OVERRIDES),
]);

// Test users seeded into the realm. Each carries a FIXED id (= the Keycloak user
// id / JWT "sub"), so apps that key off keycloakId stay stable across a realm
// wipe + reimport. (stripIds removes ids everywhere; we restore these after.)
const TEST_USERS = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    username: "alice",
    email: "alice@example.test",
    firstName: "Alice",
    lastName: "Tester",
    enabled: true,
    emailVerified: true,
    // "pseudo" is a required user-profile attribute (and a token claim apps rely
    // on); without it the account is "not fully set up" and login fails.
    attributes: { pseudo: ["alice"] },
    credentials: [{ type: "password", value: "TestPassword1234", temporary: false }],
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    username: "bob",
    email: "bob@example.test",
    firstName: "Bob",
    lastName: "Tester",
    enabled: true,
    emailVerified: true,
    attributes: { pseudo: ["bob"] },
    credentials: [{ type: "password", value: "TestPassword1234", temporary: false }],
  },
];

// Recursively strip every "id" field so Keycloak regenerates fresh UUIDs on
// import. (Seeded user ids are restored afterwards — see below.)
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

// Drop prod application clients; keep built-ins + the dev example + the clients
// we override below.
raw.clients = (raw.clients || []).filter((c) => KEPT_CLIENTS.has(c.clientId));

// Override redirect URIs / web origins / secret (and any other listed field) so
// re-imports keep stable local values without leaking prod URLs. `attributes` is
// merged into the existing map rather than replacing it, so an override can swap a
// single attribute (e.g. post.logout.redirect.uris) without dropping the others.
for (const client of raw.clients) {
  const overrides = CLIENT_OVERRIDES[client.clientId];
  if (!overrides) continue;
  const { attributes, ...rest } = overrides;
  Object.assign(client, rest);
  if (attributes) client.attributes = { ...client.attributes, ...attributes };
}

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

// Drop service-account users orphaned by the client filter above, plus any prod
// copy of our seeded users (matched by username) so the seed list wins.
const seededUsernames = new Set(TEST_USERS.map((u) => u.username));
raw.users = (raw.users || []).filter(
  (u) =>
    (!u.serviceAccountClientId || KEPT_CLIENTS.has(u.serviceAccountClientId)) &&
    !seededUsernames.has(u.username)
);

// Seed the test users.
raw.users = [...raw.users, ...TEST_USERS];

const cleaned = stripIds(raw);

// Restore the FIXED ids for seeded users (stripIds removed them).
for (const user of TEST_USERS) {
  if (!user.id) continue;
  const target = cleaned.users.find((u) => u.username === user.username);
  if (target) target.id = user.id;
}

fs.writeFileSync(OUTPUT, JSON.stringify(cleaned, null, 2) + "\n");
console.log(`Wrote ${OUTPUT} (${fs.statSync(OUTPUT).size} bytes)`);
