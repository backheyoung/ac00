@echo off
chcp 65001 > nul
title 스틱맨 워즈 모바일 & 온라인 서버
echo ==============================================================
echo   🎮 스틱맨 워즈 모바일 & 인터넷 접속 서버를 시작합니다...
echo   (와이파이 상관없이 LTE / 5G / 다른 네트워크 어디서나 접속 가능)
echo ==============================================================
echo.
start "" node server.js
timeout /t 2 /nobreak > nul
echo 🌐 외부 인터넷 접속 터널 연결 중...
ssh -o StrictHostKeyChecking=no -R 80:127.0.0.1:3000 serveo.net
pause
