# 1. 베이스 이미지 선택 (Java 21 버전에 맞춰 선택)
FROM openjdk:21-jdk-slim

# 2. JAR 파일이 위치할 경로를 변수로 지정
ARG JAR_FILE=build/libs/*.jar

# 3. 위에서 지정한 JAR 파일을 컨테이너 내부로 복사
COPY ${JAR_FILE} app.jar

# 4. 컨테이너가 시작될 때 실행할 포트 설정 (Spring 기본 포트)
EXPOSE 8080

# 5. 컨테이너가 시작될 때 JAR 파일을 실행하는 명령어
ENTRYPOINT ["java","-jar","/app.jar"]