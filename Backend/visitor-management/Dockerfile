# ---- build stage: compile the Spring Boot jar ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
# Cache dependencies first (only re-downloads when pom.xml changes).
COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -q -DskipTests clean package

# ---- run stage: small JRE image ----
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/visitor-management-0.0.1-SNAPSHOT.jar app.jar
# Uploaded images live here; mount a volume so they survive container restarts.
RUN mkdir -p /app/uploads
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
