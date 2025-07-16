@echo off
echo Starting Email Server for lowrybunks...
echo.
echo This will start the Node.js email server on port 3002
echo Make sure you have installed dependencies with: npm install
echo.
pause
cd /d "%~dp0"
npm run email-server
