#!/bin/bash

# SRE Assistant App 本地開發重新建置腳本
# 用法: ./rebuild.sh [options]
# 選項:
#   --no-frontend    跳過前端建置
#   --no-backend     跳過後端建置
#   --no-deploy      跳過部署
#   --no-restart     跳過 Grafana 重啟
#   --clean          清理 dist 目錄
#   --help          顯示幫助信息

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置變數
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="${SCRIPT_DIR}/dist"
GRAFANA_PLUGIN_DIR="/opt/homebrew/var/lib/grafana/plugins/sre-assistant-app"
GOOS="darwin"
GOARCH="arm64"

# 解析命令行參數
SKIP_FRONTEND=false
SKIP_BACKEND=false
SKIP_DEPLOY=false
SKIP_RESTART=false
CLEAN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --no-frontend)
      SKIP_FRONTEND=true
      shift
      ;;
    --no-backend)
      SKIP_BACKEND=true
      shift
      ;;
    --no-deploy)
      SKIP_DEPLOY=true
      shift
      ;;
    --no-restart)
      SKIP_RESTART=true
      shift
      ;;
    --clean)
      CLEAN=true
      shift
      ;;
    --help|-h)
      echo "SRE Assistant App 重新建置腳本"
      echo "用法: $0 [options]"
      echo ""
      echo "選項:"
      echo "  --no-frontend    跳過前端建置"
      echo "  --no-backend     跳過後端建置"
      echo "  --no-deploy      跳過部署"
      echo "  --no-restart     跳過 Grafana 重啟"
      echo "  --clean          清理 dist 目錄"
      echo "  --help, -h       顯示此幫助信息"
      exit 0
      ;;
    *)
      echo -e "${RED}錯誤: 未知選項 $1${NC}"
      echo "使用 --help 查看可用選項"
      exit 1
      ;;
  esac
done

# 檢查必要工具
check_command() {
  local cmd=$1
  local name=$2
  if ! command -v "$cmd" &> /dev/null; then
    echo -e "${RED}錯誤: $name 未安裝或不在 PATH 中${NC}"
    echo "請確保已安裝 $name"
    exit 1
  fi
}

echo -e "${BLUE}檢查必要工具...${NC}"
check_command npm "Node.js/npm"
check_command go "Go"
check_command brew "Homebrew"

# 清理函數
cleanup() {
  if [[ "$CLEAN" == "true" ]]; then
    echo -e "${YELLOW}清理 dist 目錄...${NC}"
    rm -rf "$DIST_DIR"
    mkdir -p "$DIST_DIR"
  fi
}

# 前端建置函數
build_frontend() {
  if [[ "$SKIP_FRONTEND" == "true" ]]; then
    echo -e "${YELLOW}跳過前端建置${NC}"
    return
  fi

  echo -e "${BLUE}建置前端...${NC}"

  if [[ ! -f "package.json" ]]; then
    echo -e "${RED}錯誤: package.json 不存在${NC}"
    exit 1
  fi

  if [[ ! -d "node_modules" ]]; then
    echo -e "${YELLOW}安裝依賴套件...${NC}"
    npm install
  fi

  echo -e "${BLUE}執行前端建置...${NC}"
  npm run build

  if [[ $? -ne 0 ]]; then
    echo -e "${RED}前端建置失敗${NC}"
    exit 1
  fi

  echo -e "${GREEN}前端建置完成${NC}"
}

# 後端建置函數
build_backend() {
  if [[ "$SKIP_BACKEND" == "true" ]]; then
    echo -e "${YELLOW}跳過後端建置${NC}"
    return
  fi

  echo -e "${BLUE}建置後端...${NC}"

  if [[ ! -f "pkg/main.go" ]]; then
    echo -e "${YELLOW}警告: pkg/main.go 不存在，跳過後端建置${NC}"
    return
  fi

  local binary_name="gpx_assistant"

  echo -e "${BLUE}編譯 Go 二進制檔案 (${GOOS}/${GOARCH})...${NC}"
  GOOS="$GOOS" GOARCH="$GOARCH" go build -o "$DIST_DIR/$binary_name" ./pkg

  if [[ $? -ne 0 ]]; then
    echo -e "${RED}後端建置失敗${NC}"
    exit 1
  fi

  echo -e "${GREEN}後端建置完成: $DIST_DIR/$binary_name${NC}"
}

# 部署函數
deploy() {
  if [[ "$SKIP_DEPLOY" == "true" ]]; then
    echo -e "${YELLOW}跳過部署${NC}"
    return
  fi

  echo -e "${BLUE}部署到 Grafana 插件目錄...${NC}"

  # 檢查插件目錄是否存在
  if [[ ! -d "$GRAFANA_PLUGIN_DIR" ]]; then
    echo -e "${YELLOW}創建 Grafana 插件目錄: $GRAFANA_PLUGIN_DIR${NC}"
    sudo mkdir -p "$GRAFANA_PLUGIN_DIR"
  fi

  # 檢查 dist 目錄是否存在
  if [[ ! -d "$DIST_DIR" ]]; then
    echo -e "${RED}錯誤: dist 目錄不存在${NC}"
    exit 1
  fi

  # 複製檔案
  echo -e "${BLUE}複製檔案到 $GRAFANA_PLUGIN_DIR...${NC}"
  sudo cp -r "$DIST_DIR"/* "$GRAFANA_PLUGIN_DIR"/

  if [[ $? -ne 0 ]]; then
    echo -e "${RED}檔案複製失敗${NC}"
    exit 1
  fi

  echo -e "${GREEN}部署完成${NC}"
}

# 重啟 Grafana 函數
restart_grafana() {
  if [[ "$SKIP_RESTART" == "true" ]]; then
    echo -e "${YELLOW}跳過 Grafana 重啟${NC}"
    return
  fi

  echo -e "${BLUE}重啟 Grafana 服務...${NC}"

  # 檢查 Grafana 服務狀態
  if ! brew services list | grep grafana | grep started > /dev/null; then
    echo -e "${YELLOW}Grafana 服務未運行，將啟動服務${NC}"
    brew services start grafana
  else
    brew services restart grafana
  fi

  if [[ $? -ne 0 ]]; then
    echo -e "${RED}Grafana 重啟失敗${NC}"
    exit 1
  fi

  echo -e "${GREEN}Grafana 重啟完成${NC}"
}

# 主函數
main() {
  echo -e "${BLUE}=== SRE Assistant App 重新建置腳本 ===${NC}"
  echo -e "${BLUE}開始時間: $(date)${NC}"
  echo ""

  # 執行各個階段
  cleanup
  build_frontend
  build_backend
  deploy
  restart_grafana

  echo ""
  echo -e "${GREEN}=== 所有步驟完成！===${NC}"
  echo -e "${GREEN}結束時間: $(date)${NC}"

  if [[ "$SKIP_DEPLOY" == "false" && "$SKIP_RESTART" == "false" ]]; then
    echo -e "${GREEN}插件已部署並重啟 Grafana${NC}"
    echo -e "${GREEN}請檢查 Grafana UI 以確認插件正常運行${NC}"
  fi
}

# 錯誤處理
trap 'echo -e "${RED}腳本執行失敗${NC}"' ERR

# 執行主函數
main "$@"