# 貢獻指南 (Contributing Guide)

感謝您有興趣參與 **SRE Assistant App** 的開發！

本專案嚴格遵循 Grafana 插件開發標準與 SRE 最佳實踐。在開始貢獻之前，請務必閱讀以下文件：

1.  **專案憲法 (Constitution)**: 請參閱 [.specify/memory/constitution.md](../.specify/memory/constitution.md)。這是本專案的最高指導原則，包含程式碼規範、安全要求與開發流程。
2.  **README**: 請參閱 [README.md](../README.md) 以了解專案架構、安裝步驟與開發藍圖。

## 開發流程簡述

1.  **Fork & Clone**: 複製專案到本地環境。
2.  **安裝依賴**: `npm install`
3.  **啟動環境**: `npm run server` (啟動 Grafana 與插件)
4.  **開發與測試**:
    *   前端熱更新：`npm run dev`
    *   類型檢查：`npm run typecheck`
    *   程式碼排版：`npm run lint`
5.  **提交 Pull Request**: 請確保通過所有檢查，並附上清楚的描述。

---
*Happy Coding!*
