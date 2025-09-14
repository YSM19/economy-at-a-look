# Multi-stage 빌드를 사용하여 빌드와 런타임 환경을 분리
FROM eclipse-temurin:21-jdk-jammy AS build

# 작업 디렉토리 설정
WORKDIR /app

# Gradle wrapper와 build 파일들 복사
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .

# 권한 설정
RUN chmod +x ./gradlew

# 의존성 다운로드 (캐시 최적화)
RUN ./gradlew dependencies --no-daemon

# 소스 코드 복사
COPY src src

# 애플리케이션 빌드
RUN ./gradlew bootJar --no-daemon

# 런타임 스테이지
FROM eclipse-temurin:21-jre-jammy

# 작업 디렉토리 설정
WORKDIR /app

# 빌드된 JAR 파일 복사
COPY --from=build /app/build/libs/*.jar app.jar

## 보안: 비루트 사용자 생성 및 사용
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
## 업로드 디렉토리 생성 및 권한 부여 (영속 볼륨 마운트 권장 경로)
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app/uploads
USER appuser:appgroup

# 애플리케이션 포트 노출
EXPOSE 8080

# 환경 변수 설정
ENV JAVA_OPTS="-Xmx512m -Xms256m"

# 애플리케이션 실행
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
