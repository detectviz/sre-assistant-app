/**
 * @description 對應 architecture.md 第 3.2 節，為 LLM 與 MCP 整合提供型別宣告以利前端編譯。
 */
declare module '@grafana/llm' {
  export namespace llm {
    type Role = 'system' | 'user' | 'assistant';
    interface Message {
      role: Role;
      content: string;
    }
    interface ChatCompletionsOptions {
      model: string;
      messages: Message[];
      temperature?: number;
    }
    interface ChatCompletionsChoice {
      message?: { content?: string };
    }
    interface ChatCompletionsResponse {
      choices?: ChatCompletionsChoice[];
    }
  }

  export const llm: {
    enabled(): Promise<boolean>;
    Model: { BASE: string };
    chatCompletions(options: llm.ChatCompletionsOptions): Promise<llm.ChatCompletionsResponse>;
  };

  export namespace mcp {
    interface ClientOptions {
      name: string;
      version: string;
    }

    class Client {
      constructor(options: ClientOptions);
      use(transport: unknown): void;
      connect(transport: unknown): Promise<void>;
      close(): Promise<void>;
      callTool<T = unknown>(payload: { name: string; arguments: Record<string, unknown> }): Promise<T>;
    }

    class StreamableHTTPClientTransport {
      constructor(url: string);
    }

    function streamableHTTPURL(): string;
    function enabled(): Promise<boolean>;
  }

  export const mcp: {
    Client: typeof mcp.Client;
    StreamableHTTPClientTransport: typeof mcp.StreamableHTTPClientTransport;
    streamableHTTPURL: typeof mcp.streamableHTTPURL;
    enabled: typeof mcp.enabled;
  };
}
