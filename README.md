# Economy at a Look

간단한 경제 지표/환율/물가 데이터를 확인하고 커뮤니티 기능을 제공하는 서비스입니다.
- Backend: Spring Boot 
- Frontend: React Native (Expo, expo-router)
- 배포: GitHub Actions → AWS (EC2)

## 레포 구조
- `economy/`: Spring Boot 백엔드 API 서버
- `frontend/`: 모바일 앱 (React Native + Expo)
- `.github/workflows/`: CI/CD 워크플로우

## 주요 기능
- 사용자 회원가입/로그인/프로필 관리, JWT 인증
- 관리자 기능(공지/신고/문의 관리)
- 한국수출입은행 환율 API, 한국은행 ECOS 경제지표 API 연동
- 게시글/댓글/좋아요/북마크 및 이미지 업로드
