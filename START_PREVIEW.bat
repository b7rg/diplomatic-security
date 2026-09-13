@echo off
setlocal
title Diplomatic Security Command V5.4
cd /d "%~dp0"

echo.
echo ==================================================
echo   Diplomatic Security Command V5.4 - Local Preview
echo ==================================================
echo.

if not exist package.json (
  echo [ERROR] package.json was not found in this folder.
  echo Make sure you extracted the ZIP first, then run this file from the project folder.
  echo.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not available in PATH.
  echo Install Node.js LTS, reopen this folder, then try again.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm is not available in PATH.
  echo Reinstall Node.js LTS and make sure npm is included.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [1/2] Installing project packages for the first run...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] Package installation failed.
    echo Check your internet connection, then run START_PREVIEW.bat again.
    echo.
    pause
    exit /b 1
  )
) else (
  echo [1/2] Packages are ready.
)

echo [2/2] Starting the website...
echo.
echo The browser will open automatically at:
echo http://localhost:3000
echo.
echo IMPORTANT: Keep this black window open while using the website.
echo.
start "" cmd /c "timeout /t 4 /nobreak >nul & start \"\" http://localhost:3000"
call npm run dev

echo.
echo The local server stopped.
pause
endlocal
