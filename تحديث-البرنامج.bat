@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist "%~dp0update.ps1" (
  echo ملف التحديث update.ps1 غير موجود.
  pause
  exit /b 1
)
powershell.exe -NoLogo -NoProfile -File "%~dp0update.ps1"
set "SR_UPDATE_RESULT=%ERRORLEVEL%"
if not "%SR_UPDATE_RESULT%"=="0" echo راجع الرسالة أعلاه ودليل التحديث. لم يتم تجاوز إعدادات أمان Windows.
pause
exit /b %SR_UPDATE_RESULT%
