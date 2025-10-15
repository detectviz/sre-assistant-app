/**
 * 提供 Grafana MCP 客戶端的基本型別宣告，以便 TypeScript 編譯器辨識對應模組。
 */
declare module '@grafana/llm' {
  import type { ReactNode } from 'react';
  import type { Client as MCPClient } from '@modelcontextprotocol/sdk/client/index';

  /**
   * MCP 命名空間，包含與 Grafana LLM 套件互動所需的 Provider 與 Hook。
   */
  export namespace mcp {
    interface MCPClientProviderProps {
      /** 插件應用程式名稱。 */
      appName: string;
      /** 插件版本號，供伺服器端記錄使用。 */
      appVersion: string;
      /** React 子節點。 */
      children?: ReactNode;
    }

    interface MCPClientState {
      /** 目前建立的 MCP 客戶端實體，若尚未就緒則為 null。 */
      client: MCPClient | null;
      /** 是否已啟用 MCP 功能。 */
      enabled: boolean;
      /** 初始化或連線錯誤資訊。 */
      error?: Error | null;
    }

    /**
     * 供 React 應用包覆使用的 Provider，協助建立 MCP 連線與上下文。
     */
    const MCPClientProvider: React.ComponentType<MCPClientProviderProps>;

    /**
     * 取得目前 MCP 連線狀態的 Hook。
     */
    function useMCPClient(): MCPClientState;
  }
}

/**
 * 定義 MCP SDK Client 的最小介面，滿足告警規則查詢所需方法。
 */
declare module '@modelcontextprotocol/sdk/client/index' {
  export interface ToolCallResultContentJson {
    type: 'json';
    json?: unknown;
  }

  export interface ToolCallResultContentText {
    type: 'text';
    text?: string;
  }

  export type ToolCallResultContent =
    | ToolCallResultContentJson
    | ToolCallResultContentText
    | Record<string, unknown>;

  export interface ToolCallResult {
    content?: ToolCallResultContent[];
  }

  export interface ToolCallArguments {
    name: string;
    arguments?: Record<string, unknown>;
  }

  export interface Client {
    callTool(args: ToolCallArguments): Promise<ToolCallResult>;
  }
}
