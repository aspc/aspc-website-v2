@echo off
REM Opens backend, frontend, and the local SSL proxy in three separate terminals.
REM Backend:  https://localhost:5000
REM Frontend: https://localhost:3001 (proxied to http://localhost:3000)

cd /d "%~dp0.."
set "REPO_ROOT=%CD%"

where local-ssl-proxy >nul 2>nul
if errorlevel 1 (
    echo Installing local-ssl-proxy globally...
    call npm install -g local-ssl-proxy
)

if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    pushd backend
    call npm install
    popd
)

if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    pushd frontend
    call npm install
    popd
)

start "ASPC Backend" cmd /k "cd /d %REPO_ROOT%\backend && npm run dev"
start "ASPC Frontend" cmd /k "cd /d %REPO_ROOT%\frontend && npm run dev"
start "ASPC SSL Proxy" cmd /k "local-ssl-proxy --source 3001 --target 3000"

echo.
echo Launched backend, frontend, and SSL proxy in separate terminals.
echo Backend:  https://localhost:5000
echo Frontend: https://localhost:3001
