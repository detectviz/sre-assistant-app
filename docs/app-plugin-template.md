# Grafana Scenes App Plugin 模板

此模板是使用 [scenes](https://grafana.com/developers/scenes) 為 Grafana 建置應用插件的起點。

## 什麼是 Grafana 應用插件？

應用插件可以讓您透過自訂頁面、巢狀資料來源和面板插件來創建客製化的開箱即用監控體驗。

## 什麼是 @grafana/scenes？

[@grafana/scenes](https://github.com/grafana/scenes) 是一個框架，用於實現多功能的應用插件。它提供了一種簡單的方法來建置類似 Grafana 儀表板體驗的應用，包括模板變數支援、多功能佈局、面板渲染等等。

要了解更多關於 @grafana/scenes 的使用方式，請參考[說明文檔](https://grafana.com/developers/scenes)

### 前端開發

1. 安裝依賴套件

   ```bash
   npm install
   ```

2. 在開發模式下建置插件並以監視模式運行

   ```bash
   npm run dev
   ```

3. 在生產模式下建置插件

   ```bash
   npm run build
   ```

4. 運行測試（使用 Jest）

   ```bash
   # 運行測試並監視變更，需要先執行 git init
   npm run test

   # 運行所有測試後退出
   npm run test:ci
   ```

5. 啟動 Grafana 實例並在其中運行插件（使用 Docker）

   ```bash
   npm run server
   ```

6. 運行端到端測試（使用 Playwright）

   ```bash
   # 先啟動用於測試的 Grafana 實例
   npm run server

   # 如果您想啟動特定版本的 Grafana。若未指定，預設使用最新版本
   GRAFANA_VERSION=11.3.0 npm run server

   # 開始測試
   npm run e2e
   ```

7. 運行程式碼檢查工具

   ```bash
   npm run lint

   # 或

   npm run lint:fix
   ```

# 發佈您的插件

無論是在社群內部分發還是私人發佈 Grafana 插件，都必須對插件進行簽署，以便 Grafana 應用程式可以驗證其真實性。這可以使用 `@grafana/sign-plugin` 套件來完成。

_注意：在開發期間不需要簽署插件。使用 `@grafana/create-plugin` 搭建的 Docker 開發環境支援在沒有簽章的情況下運行插件。_