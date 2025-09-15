# Economy at a Look

간단한 경제 지표/환율/물가 데이터를 확인하고 커뮤니티 기능을 제공하는 풀스택 모노레포입니다.
- Backend: Spring Boot (Gradle)
- Frontend: React Native (Expo, expo-router)
- 배포: GitHub Actions → AWS (ECR/EC2)

## 레포 구조
- `economy/`: Spring Boot 백엔드 API 서버
- `frontend/`: 모바일 앱 (React Native + Expo)
- `.github/workflows/`: CI/CD 워크플로우

## 주요 기능
- 사용자 회원가입/로그인/프로필 관리, JWT 인증
- 관리자 기능(공지/신고/문의 관리)
- 한국수출입은행 환율 API, 한국은행 ECOS 경제지표 API 연동
- 게시글/댓글/좋아요/북마크 및 이미지 업로드

## 보안 및 시크릿 관리
민감 정보는 절대 코드에 넣지 않고 환경 변수로 주입합니다. 레포 공개용으로 `.gitignore`가 강화되었고 업로드/빌드 산출물 및 시크릿 패턴을 무시합니다. 필요한 환경 변수(예시):

- `DB_URL` (예: `jdbc:mysql://localhost:3306/economy?...`)
- `DB_USERNAME`, `DB_PASSWORD`
- `JWT_SECRET`
- `KOREAEXIM_API_AUTHKEY`, `ECOS_API_KEY`
- `ADMIN_ACCOUNT_EMAIL`, `ADMIN_ACCOUNT_PASSWORD`
- `APP_UPLOAD_URL`
- `CORS_ALLOWED_ORIGIN_PATTERNS`, `CORS_ALLOW_CREDENTIALS`, `ALLOWED_HEADERS`

GitHub Actions 배포를 사용할 경우, 해당 값은 레포지토리 Settings → Secrets and variables → Actions에 등록하세요.

## 로컬 개발 환경
### 1) 백엔드 (Spring Boot)
- 요구사항: JDK 17+, Docker(선택), Git
- MySQL 로컬 실행 예시 (Docker):
  ```bash
  docker run --name economy-mysql -e MYSQL_ROOT_PASSWORD=1234 -e MYSQL_DATABASE=economy -p 3306:3306 -d mysql:8
  ```
- 실행:
  ```bash
  cd economy
  # 개발 프로파일
  export SPRING_PROFILES_ACTIVE=dev
  # 필수 환경변수 설정 (예시)
  export DB_URL="jdbc:mysql://localhost:3306/economy?useSSL=false&useUnicode=true&serverTimezone=Asia/Seoul&allowPublicKeyRetrieval=true&createDatabaseIfNotExist=true"
  export DB_USERNAME="root"
  export DB_PASSWORD="1234"
  ./gradlew bootRun
  ```

### 2) 프론트엔드 (React Native + Expo)
- 요구사항: Node.js LTS, npm 또는 yarn, Expo CLI
- 실행:
  ```bash
  cd frontend
  npm install
  npx expo start
  ```

## 배포 개요
- 워크플로우: `.github/workflows/deploy.yml`
- GitHub Secrets 예시: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `EC2_PUBLIC_IP`, `EC2_SSH_KEY`, `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `KOREAEXIM_API_AUTHKEY`, `ECOS_API_KEY`, `JWT_SECRET`, `APP_UPLOAD_URL`, `CORS_ALLOWED_ORIGIN_PATTERNS`, `CORS_ALLOW_CREDENTIALS`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` 등

## 주의 사항
- 업로드 파일(`uploads/`), 빌드 산출물(`economy/build`, `economy/bin`)은 Git에서 추적하지 않습니다.
- 애플리케이션 설정 파일은 환경 변수 중심으로 운영합니다. 필요 시 별도의 샘플 설정 파일만 공개 저장소에 두세요.

---
문의/제안은 이슈로 등록해 주세요. 🙌
