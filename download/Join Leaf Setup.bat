@echo off
cd /d "%~dp0"
echo Joining Leaf-Setup.exe ...
copy /b Leaf-Setup.part0 + Leaf-Setup.part1 + Leaf-Setup.part2 + Leaf-Setup.part3 Leaf-Setup.exe >nul
if errorlevel 1 (echo Could not join. Put all 4 part files in the same folder as this file. & pause & exit /b 1)
echo Done. Starting the installer...
start "" "Leaf-Setup.exe"
