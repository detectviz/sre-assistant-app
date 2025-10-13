import { llm, mcp } from '@grafana/llm';

/**
 * @section 6.2 Grafana MCP Server 整合流程
 * 依據《docs/architecture.md》第 6.2 節，本模組負責與 Grafana MCP Server 建立連線並包裝常用工具。
 */
type RangePayload = { from: string; to: string };

interface MetricArgs {
  datasource: string;
  query: string;
  range: RangePayload;
  [key: string]: unknown;
}

interface LogArgs {
  datasource: string;
  query: string;
  range: RangePayload;
  limit?: number;
  [key: string]: unknown;
}

type ToolArgs = { datasource: string } & Record<string, unknown>;

interface AlertArgs {
  datasource: string;
  range: RangePayload;
  [key: string]: unknown;
}

export class MCPClient {
  private client?: InstanceType<typeof mcp.Client>;

  /**
   * 初始化 MCP Client，確保在進行任何工具呼叫前完成基本檢查與連線流程。
   */
  private async ensureClient(): Promise<InstanceType<typeof mcp.Client>> {
    if (this.client) {
      return this.client;
    }

    const llmEnabled = await llm.enabled();
    if (!llmEnabled) {
      throw new Error('LLM 服務未啟用，MCP 無法使用');
    }

    const mcpEnabled = await mcp.enabled();
    if (!mcpEnabled) {
      throw new Error('MCP 服務未啟用，請確認 Grafana LLM App 設定');
    }

    const client = new mcp.Client({
      name: 'sre-assistant-app',
      version: '1.0.0',
    });

    const transport = new mcp.StreamableHTTPClientTransport(mcp.streamableHTTPURL());
    await client.connect(transport);

    this.client = client;
    return client;
  }

  /**
   * 通用工具呼叫介面，封裝所有錯誤處理與日誌紀錄。
   */
  private async callTool<T>(name: 'queryMetrics' | 'getLogs' | 'listAlerts', args: ToolArgs): Promise<T> {
    if (!args.datasource) {
      throw new Error(`呼叫 ${name} 前必須提供 datasource`);
    }
    const client = await this.ensureClient();

    try {
      const response = await client.callTool({
        name,
        arguments: args,
      });
      return response as T;
    } catch (error) {
      console.error(`[MCP] 工具呼叫失敗: ${name}`, error);
      throw error;
    }
  }

  /**
   * 封裝 queryMetrics 工具，依據第 7 章的數據流程提供統一入口。
   */
  async queryMetrics<T = unknown>(args: MetricArgs): Promise<T> {
    return this.callTool<T>('queryMetrics', args);
  }

  /**
   * 取得即時日誌資料，供 Insight 與 Incident 頁面顯示佐證。
   */
  async getLogs<T = unknown>(args: LogArgs): Promise<T> {
    return this.callTool<T>('getLogs', args);
  }

  /**
   * 擷取告警狀態，提供 Overview 與 Incident 頁面展示。
   */
  async listAlerts<T = unknown>(args: AlertArgs): Promise<T> {
    return this.callTool<T>('listAlerts', args);
  }
}

export const mcpClient = new MCPClient();
