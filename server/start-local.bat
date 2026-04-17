@echo off
REM Windows 本地测试一键启动脚本
REM
REM 使用方法：双击运行 start-local.bat

echo ========================================
echo Xinjuben 本地测试环境启动
echo ========================================
echo ""

REM 检查 PocketBase 是否存在
if not exist "pocketbase.exe" (
    echo 错误：找不到 PocketBase
    echo ""
    echo 请先下载 PocketBase：
    echo   https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_windows_amd64.zip
    echo ""
    echo 解压后将 pocketbase.exe 放到 server 目录下
    pause
    exit /b 1
)

REM 1. 启动 PocketBase
echo 1. 启动 PocketBase...
start "PocketBase" pocketbase.exe serve --http=127.0.0.1:8090
echo    管理后台: http://localhost:8090/_/
timeout /t 3 /nobreak > nul
echo ""

REM 2. 等待 PocketBase 启动
echo 2. 等待 PocketBase 启动...
:wait_pb
curl -s http://localhost:8090/api/health > nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak > nul
    goto wait_pb
)
echo    ✓ PocketBase 已启动
echo ""

REM 3. 检查管理员
echo 3. 检查管理员账号...
echo    如果是首次运行，请在浏览器打开：
echo    http://localhost:8090/_/
echo    创建管理员账号
echo ""
echo    创建后，更新 server/.env 文件中的：
echo      PB_ADMIN_EMAIL=你创建的邮箱
echo      PB_ADMIN_PASSWORD=你创建的密码
echo ""
pause

REM 4. 初始化数据库
echo 4. 初始化数据库表...
call npx tsx scripts/init-pocketbase.ts
echo ""

REM 5. 启动 Node.js 后端
echo 5. 启动 Node.js 后端...
start "Server" cmd /k npx tsx src/index.ts
echo    API 地址: http://localhost:3001
timeout /t 3 /nobreak > nul
echo ""

REM 6. 测试注册流程
echo 6. 测试注册流程...
call npx tsx scripts/test-register.ts
echo ""

echo ========================================
echo ✓ 本地测试环境已启动
echo ========================================
echo ""
echo 服务地址：
echo   PocketBase 管理后台: http://localhost:8090/_/
echo   API 服务: http://localhost:3001
echo ""
echo 关闭此窗口不会停止服务
echo 请手动关闭 PocketBase 和 Server 窗口
pause