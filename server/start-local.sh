#!/bin/bash
# 本地测试一键启动脚本
#
# 使用方法：
#   chmod +x start-local.sh
#   ./start-local.sh
#
# 或者直接运行：
#   bash start-local.sh

echo "========================================"
echo "Xinjuben 本地测试环境启动"
echo "========================================"
echo ""

# 检查 PocketBase 是否存在
if [ ! -f "pocketbase.exe" ] && [ ! -f "pocketbase" ]; then
    echo "错误：找不到 PocketBase"
    echo ""
    echo "请先下载 PocketBase："
    echo "  Windows: https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_windows_amd64.zip"
    echo "  Mac/Linux: https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_linux_amd64.zip"
    echo ""
    echo "解压后将 pocketbase.exe 或 pocketbase 放到 server 目录下"
    exit 1
fi

# 1. 启动 PocketBase
echo "1. 启动 PocketBase..."

if [ -f "pocketbase.exe" ]; then
    # Windows
    ./pocketbase.exe serve --http=127.0.0.1:8090 & > pocketbase.log 2>&1
else
    # Mac/Linux
    ./pocketbase serve --http=127.0.0.1:8090 & > pocketbase.log 2>&1
fi

PB_PID=$!
echo "   PocketBase PID: $PB_PID"
echo "   访问管理后台: http://localhost:8090/_/"
sleep 2
echo ""

# 2. 等待 PocketBase 启动
echo "2. 等待 PocketBase 启动..."
for i in {1..10}; do
    if curl -s http://localhost:8090/api/health > /dev/null 2>&1; then
        echo "   ✓ PocketBase 已启动"
        break
    fi
    sleep 1
done
echo ""

# 3. 检查是否需要创建管理员
echo "3. 检查管理员账号..."
echo "   如果是首次运行，请访问 http://localhost:8090/_/ 创建管理员账号"
echo "   创建后，请更新 server/.env 文件中的："
echo "     PB_ADMIN_EMAIL=你创建的邮箱"
echo "     PB_ADMIN_PASSWORD=你创建的密码"
echo ""
echo "   按任意键继续..."
read -n 1 -s
echo ""

# 4. 初始化数据库
echo "4. 初始化数据库表..."
npx tsx scripts/init-pocketbase.ts
echo ""

# 5. 启动 Node.js 后端
echo "5. 启动 Node.js 后端..."
npx tsx src/index.ts & > server.log 2>&1
SERVER_PID=$!
echo "   Server PID: $SERVER_PID"
echo "   API 地址: http://localhost:3001"
sleep 2
echo ""

# 6. 测试注册流程
echo "6. 测试注册流程..."
npx tsx scripts/test-register.ts
echo ""

echo "========================================"
echo "✓ 本地测试环境已启动"
echo "========================================"
echo ""
echo "服务地址："
echo "  PocketBase 管理后台: http://localhost:8090/_/"
echo "  API 服务: http://localhost:3001"
echo ""
echo "停止服务："
echo "  kill $PB_PID $SERVER_PID"
echo ""