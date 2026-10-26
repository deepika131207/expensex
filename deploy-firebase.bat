@echo off
title ExpenseX - Deploy to Firebase Hosting
color 0A
echo ============================================================
echo           ExpenseX - Firebase Hosting Deployment
echo ============================================================
echo Target Project: expensex-a6d8a
echo Target Account: deepikaklywtf@gmail.com
echo Target URL:     https://expensex-a6d8a.web.app
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/2] Connecting to Firebase CLI...
echo A browser window will open. Please choose: deepikaklywtf@gmail.com and click 'Allow'.
echo.
call npx -y firebase-tools login

echo.
echo [2/2] Deploying website to Firebase Hosting...
call npx -y firebase-tools deploy --only hosting

echo.
echo ============================================================
echo           Deployment Finished Successfully!
echo   Visit your live website at: https://expensex-a6d8a.web.app
echo ============================================================
echo.
pause
