# Global ARG — must be declared before the first FROM so it's visible to every stage
# that re-declares it.
ARG KEYCLOAK_VERSION=26.5.0

# unique-attribute-validator-provider
FROM maven:3.9-eclipse-temurin-17 AS unique-attribute-validator-provider

WORKDIR /app

COPY unique-attribute-validator-provider/pom.xml .
COPY unique-attribute-validator-provider/src ./src

RUN mvn clean package && \
    mkdir -p /result && \
    cp /app/target/unique-attribute-validator-provider-1.0-SNAPSHOT.jar /result/unique-attribute-validator-provider.jar

# min-age-validator-provider
FROM maven:3.9-eclipse-temurin-17 AS min-age-validator-provider

WORKDIR /app

COPY min-age-validator-provider/pom.xml .
COPY min-age-validator-provider/src ./src

RUN mvn clean package && \
    mkdir -p /result && \
    cp /app/target/min-age-validator-provider-1.0-SNAPSHOT.jar /result/min-age-validator-provider.jar

# altered-account-ui — custom account console (React app packaged as a theme JAR).
# The pom's frontend-maven-plugin downloads node and runs the vite build, then
# bundles dist/ + the theme resources into the JAR (deployed like any provider).
FROM maven:3.9-eclipse-temurin-17 AS account-console

WORKDIR /app

COPY account-console/ ./

RUN mvn -B clean package && \
    mkdir -p /result && \
    cp /app/target/altered-account-ui-26.5.0.jar /result/altered-account-ui.jar

FROM quay.io/keycloak/keycloak:${KEYCLOAK_VERSION} AS builder
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
ENV KC_DB=postgres
ENV KC_FEATURES=authorization,account,account-api,docker,web-authn,client-policies,ciba,par

WORKDIR /opt/keycloak

COPY --from=unique-attribute-validator-provider /result/unique-attribute-validator-provider.jar /opt/keycloak/providers
COPY --from=min-age-validator-provider /result/min-age-validator-provider.jar /opt/keycloak/providers
COPY --from=account-console /result/altered-account-ui.jar /opt/keycloak/providers

RUN /opt/keycloak/bin/kc.sh build

FROM quay.io/keycloak/keycloak:${KEYCLOAK_VERSION} AS final
COPY --from=builder /opt/keycloak/ /opt/keycloak/
COPY ./themes /opt/keycloak/themes

ENV KC_DB=postgres

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--optimized"]
