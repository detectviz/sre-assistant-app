import { llm, mcp } from '@grafana/llm';

export interface MCPMetricQuery {
  query: string;
  range?: { from: string; to: string };
  [key: string]: unknown;
}

export interface MCPLogQuery {
  query: string;
  limit?: number;
  range?: { from: string; to: string };
  [key: string]: unknown;
}

export interface MCPAlertQuery {
  service?: string;
  environment?: string;
  [key: string]: unknown;
}

/**
 * @description 依據 architecture.md 第 6.2 節，封裝 MCP 工具的連線與呼叫流程。
 */
export class MCPClient {
  private client?: InstanceType<typeof mcp.Client>;

  private async ensureConnected(): Promise<InstanceType<typeof mcp.Client>> {
    if (this.client) {
      return this.client;
    }

    const llmEnabled = await llm.enabled();
    if (!llmEnabled) {
      throw new Error('LLM 服務未啟用，無法使用 MCP 工具。');
    }

    const enabled = await mcp.enabled();
    if (!enabled) {
      throw new Error('MCP 服務尚未啟用，請至 Grafana LLM App 檢查設定。');
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

  async queryMetrics(query: MCPMetricQuery) {
    const client = await this.ensureConnected();
    const result = await client.callTool({
      name: 'queryMetrics',
      arguments: query,
    });
    return result;
  }

  async getLogs(query: MCPLogQuery) {
    const client = await this.ensureConnected();
    const result = await client.callTool({
      name: 'getLogs',
      arguments: query,
    });
    return result;
  }

  async listAlerts(query: MCPAlertQuery) {
    const client = await this.ensureConnected();
    const result = await client.callTool({
      name: 'listAlerts',
      arguments: query,
    });
    return result;
  }
}

export const createMCPClient = () => new MCPClient();
