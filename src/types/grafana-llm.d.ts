/**
 * @section 6 AI 平台整合
 * 提供 @grafana/llm 模組的最小型別宣告，確保 TypeScript 能成功編譯封裝層邏輯。
 */
declare module '@grafana/llm' {
  export namespace llm {
    type Role = 'system' | 'user' | 'assistant';

    interface Message {
      role: Role;
      content: string;
    }

    interface ChatCompletionsRequest {
      model: Model;
      messages: Message[];
      [key: string]: unknown;
    }

    interface ChatCompletionsChoice {
      message?: Message;
      [key: string]: unknown;
    }

    interface ChatCompletionsResponse {
      choices: ChatCompletionsChoice[];
      [key: string]: unknown;
    }

    interface ModelMap {
      BASE: string;
      [key: string]: string;
    }

    type Model = ModelMap[keyof ModelMap];
  }

  export namespace mcp {
    export interface ClientOptions {
      name: string;
      version: string;
    }

    export interface ToolCallRequest {
      name: string;
      arguments: Record<string, unknown>;
    }

    export class Client {
      constructor(options: ClientOptions);
      connect(transport: StreamableHTTPClientTransport): Promise<void>;
      callTool<T = unknown>(request: ToolCallRequest): Promise<T>;
    }

    export class StreamableHTTPClientTransport {
      constructor(url: string);
    }

    export function streamableHTTPURL(): string;
    export function enabled(): Promise<boolean>;
  }

  export interface LLMModule {
    Model: llm.ModelMap;
    enabled(): Promise<boolean>;
    chatCompletions(request: llm.ChatCompletionsRequest): Promise<llm.ChatCompletionsResponse>;
  }

  export interface MCPModule {
    Client: typeof mcp.Client;
    StreamableHTTPClientTransport: typeof mcp.StreamableHTTPClientTransport;
    streamableHTTPURL: typeof mcp.streamableHTTPURL;
    enabled: typeof mcp.enabled;
  }

  export const llm: LLMModule;
  export const mcp: MCPModule;
}
