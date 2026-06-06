# Altered Re:Union — account console

Custom Keycloak Account Console for the `players` realm, deployed as a theme JAR
(`altered-account`, parent `keycloak.v3`) and loaded like a provider.

## This is vendored source, not the npm package

The source under `src/` is **Keycloak's real account console**
(`js/apps/account-ui` from the `keycloak` repo, tag **26.5.0**) copied in
verbatim — *not* the `@keycloak/keycloak-account-ui` npm package.

Why: the published `@keycloak/keycloak-account-ui@26.5.x` bundles its own
`i18next` instance, configures it, but never calls `init()` on it and doesn't
export it. Its pages call `i18n.changeLanguage()` / `i18n.languages` on that
dead instance, so any locale path crashes with
`hasLanguageSomeTranslations … this.store is undefined`. The real app doesn't
have this bug because it's a single i18n instance and `main.tsx` runs
`await i18n.init()`. Vendoring the source gets us that working code **and**
makes every page editable.

> **Version pinning.** `src/` and the `@keycloak/*` + PatternFly deps are pinned
> to the Keycloak server (**26.5.0**, see [`../Dockerfile`](../Dockerfile)).

## Re-vendoring on a Keycloak upgrade (base + patches model)

This directory is committed as a **pristine vendored base** (this README plus the
build glue are the only non-upstream files). To upgrade:

1. `git clone --depth 1 --branch <new-version> --filter=blob:none --sparse
   https://github.com/keycloak/keycloak.git` and
   `git sparse-checkout set js/apps/account-ui`.
2. Copy its `src/` and `public/` over this one; copy
   `maven-resources/theme/keycloak.v3/account/index.ftl` over
   `maven-resources/theme/altered-account/account/index.ftl`.
3. Bump the `@keycloak/*` + peer deps in `package.json` to the new version.
4. Commit as the new base, then replay your customization commits on top.

## What is *not* upstream (the build glue)

- `package.json` — standalone npm deps (drops the workspace `wireit`/`pnpm`
  setup; uses the published `@keycloak/keycloak-ui-shared` +
  `@keycloak/keycloak-admin-client` instead of monorepo workspace builds).
- `pom.xml` — `frontend-maven-plugin` runs the vite build and bundles the
  `altered-account` theme JAR (`re.altered:altered-account-ui:26.5.0`, the name
  the [`../Dockerfile`](../Dockerfile) copies into `providers/`).
- `vite.config.ts`, `tsconfig*.json`, `start-server.js` — standalone build/dev.
- `maven-resources/` — theme named `altered-account` (parent `keycloak.v3`) so
  it doesn't override the built-in console; `index.ftl` is the stock
  `keycloak.v3` template.

## Customizations

**None yet** — this is the clean baseline. The console's nav is driven by
`public/content.json` and `src/routes.tsx`; profile attribute labels live in the
server-side messages of the parent theme. Future changes (e.g. dropping the
Applications tab via `content.json`, branding via `theme.properties`) land as
separate commits on top of this base.

## Develop (live reload)

```bash
npm install
npm run start-keycloak     # downloads & runs a dev Keycloak 26.5.0 on :8080
npm run dev                # vite dev server, HMR
```

Open http://localhost:8080/realms/master/account (admin/admin).

## Build (production JAR)

```bash
mvn -B clean package       # -> target/altered-account-ui-26.5.0.jar
```

The realm uses this theme via `accountTheme: "altered-account"` (see
[`../../dev/realm-export.json`](../../dev/realm-export.json)).
