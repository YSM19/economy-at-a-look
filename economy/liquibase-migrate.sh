#!/bin/bash

# Liquibase 마이그레이션 스크립트
# 사용법: ./liquibase-migrate.sh [환경] [명령어]
# 예시: ./liquibase-migrate.sh dev update
# 예시: ./liquibase-migrate.sh prod status

# 환경 설정 (기본값: dev)
ENVIRONMENT=${1:-dev}
COMMAND=${2:-update}

# 색상 설정
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Liquibase 마이그레이션 스크립트 ===${NC}"
echo -e "환경: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "명령어: ${YELLOW}$COMMAND${NC}"

case $ENVIRONMENT in
    "dev")
        echo -e "${GREEN}개발 환경으로 마이그레이션을 실행합니다.${NC}"
        ./gradlew liquibaseUpdate -PrunList=main
        ;;
    "prod")
        echo -e "${YELLOW}운영 환경으로 마이그레이션을 실행합니다. 계속하시겠습니까? (y/N)${NC}"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            echo -e "${GREEN}운영 환경 마이그레이션을 실행합니다.${NC}"
            ./gradlew liquibaseUpdate -PrunList=prod
        else
            echo -e "${RED}마이그레이션이 취소되었습니다.${NC}"
            exit 1
        fi
        ;;
    *)
        echo -e "${RED}알 수 없는 환경입니다: $ENVIRONMENT${NC}"
        echo "사용 가능한 환경: dev, prod"
        exit 1
        ;;
esac

# 명령어별 실행
case $COMMAND in
    "update")
        echo -e "${GREEN}데이터베이스 업데이트를 완료했습니다.${NC}"
        ;;
    "status")
        echo -e "${GREEN}마이그레이션 상태를 확인합니다.${NC}"
        ./gradlew liquibaseStatus -PrunList=$([[ $ENVIRONMENT == "prod" ]] && echo "prod" || echo "main")
        ;;
    "rollback")
        echo -e "${YELLOW}롤백을 실행합니다. 롤백할 changeset 수를 입력하세요:${NC}"
        read -r count
        ./gradlew liquibaseRollbackCount -PliquibaseCommandValue=$count -PrunList=$([[ $ENVIRONMENT == "prod" ]] && echo "prod" || echo "main")
        ;;
    "validate")
        echo -e "${GREEN}changelog를 검증합니다.${NC}"
        ./gradlew liquibaseValidate -PrunList=$([[ $ENVIRONMENT == "prod" ]] && echo "prod" || echo "main")
        ;;
    *)
        echo -e "${RED}알 수 없는 명령어입니다: $COMMAND${NC}"
        echo "사용 가능한 명령어: update, status, rollback, validate"
        exit 1
        ;;
esac

echo -e "${GREEN}=== 마이그레이션 완료 ===${NC}" 