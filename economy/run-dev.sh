#!/bin/bash

# 개발 환경 실행 스크립트
# 이 스크립트는 개발 환경에서 애플리케이션을 실행하는 과정을 자동화합니다.

# 종료 시 오류 표시하고 스크립트 중단
set -e

echo "===== 경제 한눈에 보기 애플리케이션 개발 환경 실행 ====="
echo "시작 시간: $(date)"

# 현재 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

# 환경 변수 설정 (개발 환경)
export SPRING_PROFILES_ACTIVE=dev
# 필수 환경 변수 확인 (기본값 제공 금지)
: "${KOREAEXIM_API_AUTHKEY:?Set KOREAEXIM_API_AUTHKEY in your environment}"

echo "개발 환경 프로필로 실행합니다: $SPRING_PROFILES_ACTIVE"
echo "API 키: ${KOREAEXIM_API_AUTHKEY:0:5}... (masked)"
echo "MySQL 데이터베이스를 사용합니다. MySQL 서버가 실행 중인지 확인하세요."
echo "필요한 데이터베이스가 없다면 다음 명령어로 생성하세요:"
echo "CREATE DATABASE IF NOT EXISTS economy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 애플리케이션 실행
echo "애플리케이션 시작 중..."
./gradlew bootRun --args='--spring.profiles.active=dev'

echo "===== 애플리케이션 종료됨 ====="
echo "종료 시간: $(date)" 
