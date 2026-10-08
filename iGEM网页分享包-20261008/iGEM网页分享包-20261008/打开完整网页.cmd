@echo off
cd /d "%~dp0"
where py >nul 2>&1
if not errorlevel 1 (
 py -3 preview.py
 goto end
)
where python >nul 2>&1
if not errorlevel 1 (
 python preview.py
 goto end
)
echo Python is required. Install Python or open this folder with VS Code Live Server.
:end
pause
