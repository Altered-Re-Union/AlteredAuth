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

Applied on top of the vendored base:

- **Brand overlay** — `theme.properties` declares `logo=logo.png`
  (`public/logo.png`, copied from the login theme) and `styles=css/account.css`
  (`public/css/account.css`). The CSS remaps PatternFly v5 global tokens to the
  `altered` palette (teal/gold accents, navy background, Inter font) — including
  the surfaces that pin their own tokens (masthead/toolbar via
  `palette--black-1000`, main section via the `m-light` variant / `light-100`) —
  and restyles form fields (rounded, teal focus glow, recessed read-only),
  labels (uppercase/spaced) and buttons (rounded, gradient primary) to match the
  login. It also keeps the masthead on a single row at every width (PatternFly
  otherwise stacks the brand above the content below `lg`), keeps the header user
  menu consistent (always the username dropdown, no mobile kebab, avatar hidden
  below 768px), and hides the
  ScrollForm "Jump to section" nav — redundant since the profile has a single
  section — letting the form span full width. `index.ftl` forces PatternFly's dark
  theme on regardless of the OS color-scheme (the other themes are always dark),
  and brands the pre-React loading screen. The logo links to the public site
  (`theme.properties` `logoUrl=https://altered.re`, read in
  `src/root/Header.tsx`) instead of the realm root.
- **Applications tab removed** — dropped from `public/content.json` and from
  `src/routes.tsx` (lazy import + `ApplicationsRoute`). The vendored
  `src/applications/*` source is left in place but is no longer routed or
  bundled.
- **Profile attribute labels** — `${profile.attributes.pseudo}` /
  `${profile.attributes.birthDate}` (declared in the realm user-profile config)
  resolve from theme messages, which the account theme didn't provide. Added
  `maven-resources/theme/altered-account/account/messages/messages_{en,fr}.properties`
  with `Pseudo` and `Birth Date` / `Date de naissance`. The login theme's EN
  labels (`build/themes/altered/login/messages/messages_en.properties`) were
  aligned to match.

The console's nav is driven by `public/content.json` and `src/routes.tsx`;
profile attribute labels live in the server-side messages of the account theme.

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
