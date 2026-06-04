<!DOCTYPE html>
<html lang="${locale.currentLanguageTag}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${msg("loginProfileTitle")}</title>
  <link rel="icon" href="${url.resourcesPath}/img/logo.png" type="image/png">
  <link rel="stylesheet" href="${url.resourcesPath}/css/login.css">
</head>
<body>

<div class="login-card">

  <div class="login-header">
    <img class="login-logo" src="${url.resourcesPath}/img/logo.png" alt="Altered Re:Union">
    <div>
      <div class="login-title">${msg("loginProfileTitle")}</div>
      <div class="login-subtitle">${msg("loginProfileSubtitle")}</div>
    </div>
  </div>

  <#if message?has_content>
    <div class="alert alert-${message.type}">
      ${kcSanitize(message.summary)?no_esc}
    </div>
  </#if>

  <form action="${url.loginAction}" method="post">

    <#-- Fully driven by the declarative user profile: Keycloak only exposes attributes
         the current user is allowed to view/edit, so disabled fields never render.
         "locale" is a system attribute — Keycloak manages it via the language switcher. -->
    <#assign systemAttrs = ["locale"]>
    <#if profile?? && profile.attributes??>
      <#list profile.attributes as attribute>
        <#if systemAttrs?seq_contains(attribute.name)><#continue></#if>
        <#-- Honour the user-profile "inputType" annotation (e.g. html5-date -> date);
             fall back to email for the email field, text otherwise. -->
        <#assign annInputType = (attribute.annotations.inputType)!"">
        <#if annInputType?starts_with("html5-")>
          <#assign inputType = annInputType?remove_beginning("html5-")>
        <#else>
          <#assign inputType = (attribute.name == "email")?then("email", "text")>
        </#if>
        <div class="form-group">
          <label class="form-label" for="${attribute.name}">${advancedMsg(attribute.displayName!attribute.name)}</label>
          <input
            class="form-control"
            type="${inputType}"
            id="${attribute.name}"
            name="${attribute.name}"
            value="${(attribute.value!'')}"
            <#if (attribute.required!false)>required</#if>
            <#if (attribute.readOnly!false)>readonly</#if>
            <#if attribute.autocomplete??>autocomplete="${attribute.autocomplete}"</#if>
            aria-invalid="<#if messagesPerField.existsError('${attribute.name}')>true</#if>"
          >
          <#if messagesPerField.existsError('${attribute.name}')>
            <span class="form-error">${kcSanitize(messagesPerField.get('${attribute.name}'))?no_esc}</span>
          </#if>
        </div>
      </#list>
    </#if>

    <div class="form-actions">
      <#if isAppInitiatedAction??>
        <button class="btn-secondary" type="submit" name="cancel-aia" value="true">${msg("doCancel")}</button>
      </#if>
      <button class="btn-primary" type="submit">${msg("doSubmit")}</button>
    </div>
  </form>

</div>

</body>
</html>
