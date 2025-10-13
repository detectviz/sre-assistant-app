import { llm } from '@grafana/llm';

/**
 * @section 6.1 LLM 與 MCP 整合流程
 * 依據《docs/architecture.md》第 6.1 節，本模組封裝所有與 Grafana LLM App 溝通的細節，
 * 確保每次呼叫都會先進行可用性檢查並提供一致的錯誤處理流程。
 */
export class LLMClient {
  /**
   * 依據架構規格，所有 AI 請求都必須先確認 LLM 是否啟用，避免非預期例外。
   */
  async isEnabled(): Promise<boolean> {
    try {
      return await llm.enabled();
    } catch (error) {
      console.error('[LLM] 無法檢查服務狀態', error);
      return false;
    }
  }

  /**
   * 封裝標準的 Chat Completions 呼叫，並確保錯誤訊息以結構化方式回傳。
   */
  async chat(request: llm.ChatCompletionsRequest): Promise<llm.ChatCompletionsResponse> {
    const enabled = await this.isEnabled();
    if (!enabled) {
      throw new Error('LLM 服務未啟用，無法執行 AI 分析');
    }

    try {
      return await llm.chatCompletions(request);
    } catch (error) {
      console.error('[LLM] ChatCompletions 呼叫失敗', error);
      throw error;
    }
  }
}

export const llmClient = new LLMClient();
