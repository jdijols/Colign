# syntax=docker/dockerfile:1
#
# Two-stage build for the colign Spring Boot backend.
#
# Stage 1 builds the executable jar with the Maven wrapper (no system Maven
# needed). Tests are skipped here — they run locally and in CI; the image
# build is for packaging only, and the jacoco 80% gate (bound to `verify`)
# would otherwise fail the deploy on a coverage dip rather than a real break.
#
# Stage 2 is a slim JRE that runs the jar. -XX:MaxRAMPercentage lets the JVM
# size its heap to whatever Fly VM memory is configured (see fly.toml) instead
# of a hardcoded -Xmx, so resizing the VM doesn't need an image rebuild.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
COPY src/ src/
RUN ./mvnw -B -ntp -DskipTests clean package

FROM eclipse-temurin:21-jre
WORKDIR /app
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC"
# Glob avoids hardcoding the version; spring-boot:repackage emits one
# executable jar plus a *.jar.original, and *.jar matches only the former.
COPY --from=build /app/target/colign-backend-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
