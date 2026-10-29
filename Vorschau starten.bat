@echo off
rem Startet die Vorschau und oeffnet sie im Browser. Fenster schliessen = Vorschau beenden.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "werkzeuge\vorschau.ps1" -Oeffnen
pause
