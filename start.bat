@echo off
chcp 65001 >nul
title تصويتي - Quick Voting Platform
echo ============================================
echo   تطبيق تصويتي
echo ============================================
echo.

echo [1/2] تشغيل Backend على المنفذ 8001 ...
start "Voting Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8001"

echo [2/2] تشغيل Frontend على المنفذ 5174 ...
start "Voting Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo فتح نافذتين:
echo   - Backend (API): http://127.0.0.1:8001
echo   - Frontend:      http://localhost:5174
echo.
echo افتح المتصفح على:  http://localhost:5174
echo.
pause