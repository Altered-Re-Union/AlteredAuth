<!DOCTYPE html>
<html lang="${locale.currentLanguageTag}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("registerTitle")}</title>
  <link rel="icon" href="${url.resourcesPath}/img/logo.png" type="image/png">
  <link rel="stylesheet" href="${url.resourcesPath}/css/login.css">
</head>
<body>

<div class="login-card">

  <div class="login-header">
    <img class="login-logo" src="${url.resourcesPath}/img/logo.png" alt="Altered Re:Union">
    <div>
      <div class="login-title">${msg("registerHeader")}</div>
      <div class="login-subtitle">${msg("registerSubtitle")}</div>
    </div>
  </div>

  <#if message?has_content>
    <div class="alert alert-${message.type}">
      ${kcSanitize(message.summary)?no_esc}
    </div>
  </#if>

  <form action="${url.registrationAction}" method="post">

    <#-- Persist the UI language the user registered in as their account locale. -->
    <#if realm.internationalizationEnabled && locale??>
      <input type="hidden" name="locale" value="${locale.currentLanguageTag}">
    </#if>

    <div class="form-group">
      <label class="form-label" for="email">${msg("email")}</label>
      <input
        class="form-control"
        type="email"
        id="email"
        name="email"
        value="${(register.formData.email!'')}"
        autocomplete="email"
        autofocus
      >
    </div>

    <#if !realm.registrationEmailAsUsername>
      <div class="form-group">
        <label class="form-label" for="username">${msg("username")}</label>
        <input
          class="form-control"
          type="text"
          id="username"
          name="username"
          value="${(register.formData.username!'')}"
          autocomplete="username"
        >
      </div>
    </#if>

    <#-- Date of birth: rendered explicitly as a native date picker. The label stays neutral
         (no stated minimum age) — the min-age requirement is enforced server-side and any
         failure surfaces as a generic message, so the form never doubles as a bypass guide. -->
    <div class="form-group">
      <label class="form-label" for="birthDate">${advancedMsg("profile.attributes.birthDate")}</label>
      <input
        class="form-control"
        type="date"
        id="birthDate"
        name="birthDate"
        value="${(register.formData.birthDate!'')}"
        autocomplete="bday"
        aria-invalid="<#if messagesPerField.existsError('birthDate')>true</#if>"
      >
      <#if messagesPerField.existsError('birthDate')>
        <span class="form-error">${kcSanitize(messagesPerField.get('birthDate'))?no_esc}</span>
      </#if>
    </div>

    <#-- Custom user profile attributes: any declarative attribute not handled explicitly above.
         "locale" is a system attribute — Keycloak manages it via the language switcher. -->
    <#assign builtinAttrs = ["username", "email", "firstName", "lastName", "locale", "birthDate"]>
    <#if profile?? && profile.attributes??>
      <#list profile.attributes as attribute>
        <#if !builtinAttrs?seq_contains(attribute.name)>
          <div class="form-group">
            <label class="form-label" for="${attribute.name}">${advancedMsg(attribute.displayName!attribute.name)}</label>
            <input
              class="form-control"
              type="text"
              id="${attribute.name}"
              name="${attribute.name}"
              value="${(register.formData[attribute.name]!attribute.value!'')}"
              <#if (attribute.required!false)>required</#if>
              <#if (attribute.readOnly!false)>readonly</#if>
              <#if attribute.autocomplete??>autocomplete="${attribute.autocomplete}"</#if>
              aria-invalid="<#if messagesPerField.existsError('${attribute.name}')>true</#if>"
            >
            <#if messagesPerField.existsError('${attribute.name}')>
              <span class="form-error">${kcSanitize(messagesPerField.get('${attribute.name}'))?no_esc}</span>
            </#if>
          </div>
        </#if>
      </#list>
    </#if>

    <#if passwordRequired??>
      <div class="form-group">
        <label class="form-label" for="password">${msg("password")}</label>
        <input
          class="form-control"
          type="password"
          id="password"
          name="password"
          autocomplete="new-password"
        >
      </div>

      <div class="form-group">
        <label class="form-label" for="password-confirm">${msg("passwordConfirm")}</label>
        <input
          class="form-control"
          type="password"
          id="password-confirm"
          name="password-confirm"
          autocomplete="new-password"
        >
      </div>
    </#if>

    <#if termsAcceptanceRequired??>
      <label class="terms-checkbox">
        <input
          type="checkbox"
          id="termsAccepted"
          name="termsAccepted"
          value="true"
          ${(register.formData.termsAccepted!false)?string('checked','')}
        >
        <span>${kcSanitize(msg("termsText"))?no_esc}</span>
      </label>
    </#if>

    <#if recaptchaRequired??>
      <div class="form-group">
        <div class="g-recaptcha" data-size="compact" data-sitekey="${recaptchaSiteKey}"></div>
      </div>
    </#if>

    <div class="form-actions">
      <a class="btn-secondary" href="${url.loginUrl}">${msg("backToLogin")}</a>
      <button class="btn-primary" type="submit">${msg("doRegister")}</button>
    </div>
  </form>

  <#if realm.internationalizationEnabled && locale.supported?size gt 1>
    <div class="locale-switcher">
      <select onchange="window.location.href=this.value">
        <#list locale.supported as l>
          <option value="${l.url}" <#if locale.currentLanguageTag == l.languageTag>selected</#if>>${l.label}</option>
        </#list>
      </select>
    </div>
  </#if>

</div>

<#if recaptchaRequired??>
  <script src="https://www.google.com/recaptcha/api.js" async defer></script>
</#if>

</body>
</html>
