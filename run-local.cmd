@echo off
cd /d "%~dp0"
where node >nul 2>nul
if not errorlevel 1 (
  node scripts\serve.mjs
) else (
  where py >nul 2>nul
  if not errorlevel 1 (
    py -3 scripts\serve.py
  ) else (
    echo Install Node.js 22.13+ or Python 3.9+ to run the local server.
  )
)
pause
