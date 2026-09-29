@echo off
setlocal

set "PHP_EXE=C:\xampp\php\php.exe"

if exist "%PHP_EXE%" (
  start "Serpent Garden - API PHP" cmd /k ""%PHP_EXE%" -S 127.0.0.1:8000 -t "%~dp0..\api""
) else (
  echo PHP XAMPP introuvable : "%PHP_EXE%"
  echo Tentative avec php du PATH...
  start "Serpent Garden - API PHP" cmd /k php -S 127.0.0.1:8000 -t "%~dp0..\api"
)

cd /d "%~dp0.."
echo Demarrage de Vite (frontend React)...
npm run dev
