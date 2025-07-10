@echo off
REM Run the LangGraph agent server from the root directory (Windows)
REM This script handles all the setup and path management

echo Starting LangGraph Agent Server...
echo ==================================================

REM Check if we're in the correct directory
if not exist "agent" (
    echo Error: 'agent' directory not found.
    echo Please run this script from the project root directory.
    exit /b 1
)

REM Check for Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    where python3 >nul 2>nul
    if %errorlevel% neq 0 (
        echo Error: Python is not installed or not in PATH.
        echo Please install Python 3.8 or higher.
        exit /b 1
    )
    set PYTHON_CMD=python3
) else (
    set PYTHON_CMD=python
)

REM Check Python version
for /f "tokens=*" %%i in ('%PYTHON_CMD% -c "import sys; print(sys.version_info.major, sys.version_info.minor)"') do set PYTHON_VER=%%i
for /f "tokens=1,2" %%a in ("%PYTHON_VER%") do (
    if %%a LSS 3 (
        echo Error: Python 2 detected. Python 3.8 or higher required.
        exit /b 1
    )
    if %%a EQU 3 if %%b LSS 8 (
        echo Error: Python 3.%%b detected. Python 3.8 or higher required.
        exit /b 1
    )
)

REM Change to agent directory
cd agent

REM Check for requirements.txt
if not exist "requirements.txt" (
    echo Error: requirements.txt not found in agent directory.
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    %PYTHON_CMD% -m venv venv
    if errorlevel 1 (
        echo Error: Failed to create virtual environment.
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo Error: Virtual environment activation script not found.
    exit /b 1
)

REM Upgrade pip
echo Upgrading pip...
%PYTHON_CMD% -m pip install --upgrade pip >nul 2>&1

REM Install dependencies
echo Installing dependencies...
%PYTHON_CMD% -m pip install -r requirements.txt
if errorlevel 1 (
    echo Error: Failed to install dependencies.
    exit /b 1
)

REM Check for .env file
set ENV_FOUND=0
if exist ".env" (
    echo Loading environment from: agent\.env
    set ENV_FOUND=1
    REM Load .env file
    for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
        if not "%%a"=="" if not "%%b"=="" (
            set "%%a=%%b"
        )
    )
) else if exist "..\\.env" (
    echo Loading environment from: .env
    set ENV_FOUND=1
    REM Load .env file from parent
    for /f "usebackq tokens=1,2 delims==" %%a in ("..\\.env") do (
        if not "%%a"=="" if not "%%b"=="" (
            set "%%a=%%b"
        )
    )
)

if %ENV_FOUND%==0 (
    echo Error: No .env file found.
    echo Please create a .env file in the root directory with:
    echo   OPENAI_API_KEY=your-key
    echo   SUPABASE_URL=your-url
    echo   SUPABASE_SERVICE_KEY=your-service-key
    echo.
    echo Optional:
    echo   OPENAI_MODEL=gpt-4o-mini  ^(default: gpt-4o-mini^)
    exit /b 1
)

REM Check required environment variables
set MISSING_VARS=
if "%OPENAI_API_KEY%"=="" set MISSING_VARS=%MISSING_VARS% OPENAI_API_KEY
if "%SUPABASE_URL%"=="" set MISSING_VARS=%MISSING_VARS% SUPABASE_URL
if "%SUPABASE_SERVICE_KEY%"=="" set MISSING_VARS=%MISSING_VARS% SUPABASE_SERVICE_KEY

if not "%MISSING_VARS%"=="" (
    echo Error: Missing required environment variables:%MISSING_VARS%
    exit /b 1
)

REM Set PYTHONPATH
set PYTHONPATH=%cd%;%PYTHONPATH%

REM Check if local_server.py exists
if not exist "local_server.py" (
    echo Error: local_server.py not found in agent directory.
    exit /b 1
)

REM Run the server
echo.
echo Starting server on http://localhost:8123
echo Frontend can proxy requests to this server
echo.
echo Press Ctrl+C to stop the server
echo ==================================================
echo.

%PYTHON_CMD% -m local_server