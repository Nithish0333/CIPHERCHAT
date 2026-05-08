@echo off
echo Creating frontend-only structure...
mkdir frontend-only 2>nul
xcopy /E /I frontend\* frontend-only\ 2>nul
echo Frontend-only structure created successfully!
echo.
echo Files copied to frontend-only directory
echo.
pause
