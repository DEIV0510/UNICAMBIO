@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ====================================
echo   UNICAMBIOSVE - Deploy a GitHub
echo ====================================
echo.

git status --short
echo.

set /p msg="Mensaje del commit (o ENTER para 'Actualizar landing'): "
if "%msg%"=="" set msg=Actualizar landing

echo.
echo [1/3] git add .
git add .

echo.
echo [2/3] git commit
git commit -m "%msg%"

echo.
echo [3/3] git push
git push

echo.
echo ====================================
echo   Listo. Vercel deploya en ~30s.
echo   Revisa: https://unicambiosve.com
echo ====================================
echo.
pause
