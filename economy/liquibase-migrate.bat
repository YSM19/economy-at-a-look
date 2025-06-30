@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

:: Liquibase 마이그레이션 스크립트 (Windows용)
:: 사용법: liquibase-migrate.bat [환경] [명령어]
:: 예시: liquibase-migrate.bat dev update
:: 예시: liquibase-migrate.bat prod status

:: 환경 설정 (기본값: dev)
set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=dev

:: 명령어 설정 (기본값: update)
set COMMAND=%2
if "%COMMAND%"=="" set COMMAND=update

echo === Liquibase 마이그레이션 스크립트 ===
echo 환경: %ENVIRONMENT%
echo 명령어: %COMMAND%

if "%ENVIRONMENT%"=="dev" (
    echo 개발 환경으로 마이그레이션을 실행합니다.
    goto :execute_dev
) else if "%ENVIRONMENT%"=="prod" (
    echo 운영 환경으로 마이그레이션을 실행합니다. 계속하시겠습니까? ^(y/N^)
    set /p response=
    if /i "!response!"=="y" (
        echo 운영 환경 마이그레이션을 실행합니다.
        goto :execute_prod
    ) else (
        echo 마이그레이션이 취소되었습니다.
        exit /b 1
    )
) else (
    echo 알 수 없는 환경입니다: %ENVIRONMENT%
    echo 사용 가능한 환경: dev, prod
    exit /b 1
)

:execute_dev
if "%COMMAND%"=="update" (
    gradlew.bat liquibaseUpdate -PrunList=main
) else if "%COMMAND%"=="status" (
    gradlew.bat liquibaseStatus -PrunList=main
) else if "%COMMAND%"=="rollback" (
    set /p count=롤백할 changeset 수를 입력하세요: 
    gradlew.bat liquibaseRollbackCount -PliquibaseCommandValue=!count! -PrunList=main
) else if "%COMMAND%"=="validate" (
    gradlew.bat liquibaseValidate -PrunList=main
) else (
    echo 알 수 없는 명령어입니다: %COMMAND%
    echo 사용 가능한 명령어: update, status, rollback, validate
    exit /b 1
)
goto :end

:execute_prod
if "%COMMAND%"=="update" (
    gradlew.bat liquibaseUpdate -PrunList=prod
) else if "%COMMAND%"=="status" (
    gradlew.bat liquibaseStatus -PrunList=prod
) else if "%COMMAND%"=="rollback" (
    set /p count=롤백할 changeset 수를 입력하세요: 
    gradlew.bat liquibaseRollbackCount -PliquibaseCommandValue=!count! -PrunList=prod
) else if "%COMMAND%"=="validate" (
    gradlew.bat liquibaseValidate -PrunList=prod
) else (
    echo 알 수 없는 명령어입니다: %COMMAND%
    echo 사용 가능한 명령어: update, status, rollback, validate
    exit /b 1
)

:end
echo === 마이그레이션 완료 ===
pause 