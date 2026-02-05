@echo off
setlocal enabledelayedexpansion

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed or not in PATH.
    echo.
    echo Opening Microsoft Store to install Python 3.13...
    start ms-windows-store://pdp/?ProductId=9PNRBTZXMB4Z
    echo.
    echo If the store did not open, please visit:
    echo https://apps.microsoft.com/detail/9PNRBTZXMB4Z?hl=en-us^&gl=US^&ocid=pdpshare
    echo.
    pause
    exit /b 1
)

REM Get Python version
for /f "tokens=2" %%v in ('python --version 2^>^&1') do set PYTHON_VERSION=%%v

REM Extract major and minor version numbers
for /f "tokens=1,2 delims=." %%a in ("%PYTHON_VERSION%") do (
    set MAJOR=%%a
    set MINOR=%%b
)

REM Check if version is 3.13 or higher
if %MAJOR% LSS 3 (
    echo Python %PYTHON_VERSION% is installed, but Python 3.13 or higher is required.
    echo.
    echo Opening Microsoft Store to install Python 3.13...
    start ms-windows-store://pdp/?ProductId=9PNRBTZXMB4Z
    echo.
    echo If the store did not open, please visit:
    echo https://apps.microsoft.com/detail/9PNRBTZXMB4Z?hl=en-us^&gl=US^&ocid=pdpshare
    echo.
    pause
    exit /b 1
)

if %MAJOR% EQU 3 (
    if %MINOR% LSS 13 (
        echo Python %PYTHON_VERSION% is installed, but Python 3.13 or higher is required.
        echo.
        echo Opening Microsoft Store to install Python 3.13...
        start ms-windows-store://pdp/?ProductId=9PNRBTZXMB4Z
        echo.
        echo If the store did not open, please visit:
        echo https://apps.microsoft.com/detail/9PNRBTZXMB4Z?hl=en-us^&gl=US^&ocid=pdpshare
        echo.
        pause
        exit /b 1
    )
)

REM Run run with all passed arguments
python run %*
