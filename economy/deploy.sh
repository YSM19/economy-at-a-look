#!/bin/bash

# 배포 스크립트
# 이 스크립트는 애플리케이션을 운영 환경으로 배포하는 과정을 자동화합니다.

# 종료 시 오류 표시하고 스크립트 중단
set -e

echo "===== 경제 한눈에 보기 애플리케이션 배포 시작 ====="
echo "시작 시간: $(date)"

# 현재 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

# 필수 환경 변수 확인
if [ -z "$DB_USERNAME" ] || [ -z "$DB_PASSWORD" ] || [ -z "$KOREAEXIM_API_KEY" ]; then
    echo "오류: 필수 환경 변수가 설정되지 않았습니다."
    echo "다음 환경 변수를 설정해야 합니다: DB_USERNAME, DB_PASSWORD, KOREAEXIM_API_KEY"
    exit 1
fi

# 빌드 및 테스트
echo "애플리케이션 빌드 및 테스트 중..."
./gradlew clean test

# 테스트 성공 확인
if [ $? -ne 0 ]; then
    echo "테스트 실패. 배포를 중단합니다."
    exit 1
fi

echo "테스트 성공!"

# 운영 환경으로 빌드
echo "운영 환경용 JAR 파일 빌드 중..."
./gradlew bootJar -Pprofile=prod

# 이전 버전 백업
TIMESTAMP=$(date +%Y%m%d%H%M%S)
if [ -f "./build/libs/economy-0.0.1-SNAPSHOT.jar" ]; then
    echo "이전 버전 백업 중..."
    mkdir -p ./backups
    cp ./build/libs/economy-0.0.1-SNAPSHOT.jar "./backups/economy-${TIMESTAMP}.jar"
fi

# 서비스 중지 (필요한 경우)
if systemctl is-active --quiet economy-service; then
    echo "서비스 중지 중..."
    sudo systemctl stop economy-service
fi

# 새 버전 배포
echo "새 버전 JAR 파일 배포 중..."
sudo cp ./build/libs/economy-0.0.1-SNAPSHOT.jar /opt/economy/economy.jar
sudo chown economy:economy /opt/economy/economy.jar
sudo chmod 500 /opt/economy/economy.jar

# 서비스 시작
echo "서비스 시작 중..."
sudo systemctl start economy-service

# 서비스 상태 확인
echo "서비스 상태 확인 중..."
sudo systemctl status economy-service

echo "===== 배포 완료 ====="
echo "완료 시간: $(date)" 