@echo off
title Heart Disease Decision Tree Node UI Launcher
echo ==============================================================
echo        Starting Heart Disease Decision Tree Node UI
echo ==============================================================
echo.

:: Check and install requirements
echo [1/3] Verifying python dependencies...
python -m pip install flask pandas scikit-learn

echo.
echo [2/3] Launching local browser...
:: Wait 1 second and then open default browser to localhost
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:5000/"

echo.
echo [3/3] Starting Flask Application Server...
echo (Keep this window open while using the application)
echo.
python app.py

pause
