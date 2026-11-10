@echo off
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
cd /d "%~dp0"
python aybuben_audio_letters_retry.py
if errorlevel 9009 py aybuben_audio_letters_retry.py
