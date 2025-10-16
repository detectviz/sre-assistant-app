import React, { useEffect, useMemo } from 'react';
import { css } from '@emotion/css';
import { SceneObjectBase, type SceneComponentProps, type SceneObjectState } from '@grafana/scenes';
import { mcp } from '@grafana/llm';
import type { Client as MCPClient } from '@modelcontextprotocol/sdk/client/index';
import type { SelectableValue } from '@grafana/data';
import {
  Alert,
  Button,
  Field,
  HorizontalGroup,
  Select,
  Spinner,
  Stack,
  TextArea,
  useStyles2,
} from '@grafana/ui';
import { buildToolSelectOptions, findToolByName } from './mcpToolsCatalog';

interface GrafanaMcpToolsPanelState extends SceneObjectState {
  /** 目前選擇的 MCP 工具名稱。 */
  selectedTool?: string;
  /** 以 JSON 字串呈現的參數內容。 */
  argumentText: string;
  /** 工具執行後的原始 JSON 結果。 */
  rawResponse?: string;
  /** 最後一次執行時間 (ISO 字串)。 */
  lastExecutedAt?: string;
  /** 是否正在執行 MCP 呼叫。 */
  loading: boolean;
  /** 使用者可見的錯誤訊息。 */
  error?: string;
  /** 額外的連線狀態訊息。 */
  connectionMessage?: string;
  /** 連線狀態的告警層級。 */
  connectionSeverity?: 'info' | 'success' | 'warning' | 'error';
}

export class GrafanaMcpToolsPanel extends SceneObjectBase<GrafanaMcpToolsPanelState> {
  static Component = GrafanaMcpToolsPanelRenderer;

  private mcpClient: MCPClient | null = null;
  private mcpEnabled = false;
  private optionsCache: Array<SelectableValue<string>> | undefined;

  constructor(initialState?: Partial<GrafanaMcpToolsPanelState>) {
    super({
      argumentText: '{\n  \n}',
      loading: false,
      ...initialState,
    });
  }

  setMCPContext(context: { client: MCPClient | null; enabled: boolean; error?: Error }) {
    this.mcpClient = context.client;
    this.mcpEnabled = context.enabled;

    if (!context.enabled) {
      this.setState({
        connectionMessage: 'Grafana MCP 尚未啟用。請於 Grafana LLM App 內啟用後再使用工具。',
        connectionSeverity: 'warning',
      });
      return;
    }

    if (context.error) {
      this.setState({
        connectionMessage: `建立 MCP 連線時發生錯誤：${context.error.message}`,
        connectionSeverity: 'error',
      });
      return;
    }

    if (!context.client) {
      this.setState({
        connectionMessage: 'Grafana MCP 客戶端初始化中，請稍候…',
        connectionSeverity: 'info',
      });
      return;
    }

    this.setState({
      connectionMessage: undefined,
      connectionSeverity: undefined,
    });
  }

  selectTool(toolName?: string) {
    const tool = findToolByName(toolName);

    this.setState({
      selectedTool: toolName,
      argumentText: formatArgumentsForEditor(tool?.exampleArgs),
      error: undefined,
      rawResponse: undefined,
      lastExecutedAt: undefined,
    });
  }

  updateArgumentText(text: string) {
    this.setState({ argumentText: text });
  }

  async executeSelectedTool() {
    if (!this.mcpEnabled || !this.mcpClient) {
      this.setState({
        error: 'Grafana MCP 未就緒，無法執行工具。',
        connectionMessage: '請確認 Grafana LLM App 內的 MCP 伺服器設定。',
        connectionSeverity: 'warning',
      });
      return;
    }

    const toolName = this.state.selectedTool;

    if (!toolName) {
      this.setState({ error: '請先選擇要執行的 MCP 工具。' });
      return;
    }

    let parsedArguments: Record<string, unknown> = {};

    try {
      parsedArguments = parseArgumentText(this.state.argumentText);
    } catch (err) {
      const message = err instanceof Error ? err.message : '參數 JSON 格式錯誤，請確認後再試。';
      this.setState({ error: message });
      return;
    }

    this.setState({ loading: true, error: undefined });

    try {
      const result = await this.mcpClient.callTool({
        name: toolName,
        arguments: parsedArguments,
      });

      const rawResponse = JSON.stringify(result, null, 2);
      this.setState({
        loading: false,
        rawResponse,
        lastExecutedAt: new Date().toISOString(),
        connectionMessage: '工具執行成功，以下為原始回傳資料。',
        connectionSeverity: 'success',
      });
    } catch (err) {
      this.setState({
        loading: false,
        error: extractErrorMessage(err),
        connectionMessage: undefined,
        connectionSeverity: undefined,
      });
    }
  }

  getOptions(): Array<SelectableValue<string>> {
    if (!this.optionsCache) {
      this.optionsCache = buildToolSelectOptions();
    }

    return this.optionsCache;
  }
}

function GrafanaMcpToolsPanelRenderer({ model }: SceneComponentProps<GrafanaMcpToolsPanel>) {
  const state = model.useState();
  const { client, enabled, error: mcpError } = mcp.useMCPClient();
  const styles = useStyles2(getStyles);
  const options = useMemo(() => model.getOptions(), [model]);
  const selectedOption = options.find((option) => option.value === state.selectedTool);
  const selectedTool = findToolByName(state.selectedTool);

  useEffect(() => {
    model.setMCPContext({ client, enabled, error: mcpError ?? undefined });
  }, [client, enabled, mcpError, model]);

  const executeDisabled = !enabled || !client || !state.selectedTool || state.loading;

  return (
    <div className={styles.container}>
      <Stack gap={2} direction="column">
        <Field
          label="選擇 MCP 工具"
          description={
            selectedOption?.description ?? '請選擇要調用的 Grafana MCP 工具，介面會顯示對應的參數提示。'
          }
        >
          <Select
            placeholder="選擇工具..."
            options={options}
            value={selectedOption}
            onChange={(value) => model.selectTool(value?.value)}
            isClearable={true}
          />
        </Field>

        {selectedTool && (
          <Alert title="參數提示" severity="info">
            <div>{selectedTool.parameterNote}</div>
            {selectedTool.exampleArgs && (
              <div style={{ marginTop: '4px', fontSize: '12px' }}>
                建議參數範例：
                <pre className={styles.inlineCode}>{JSON.stringify(selectedTool.exampleArgs, null, 2)}</pre>
              </div>
            )}
          </Alert>
        )}

        <Field
          label="工具參數 (JSON 格式)"
          description="所有欄位將直接送至 MCP 工具，請確保 JSON 結構有效且不包含敏感資訊。"
        >
          <TextArea
            value={state.argumentText}
            rows={16}
            onChange={(event) => model.updateArgumentText(event.currentTarget.value)}
            spellCheck={false}
          />
        </Field>

        <HorizontalGroup spacing="sm">
          <Button icon="play" onClick={() => model.executeSelectedTool()} disabled={executeDisabled}>
            執行工具
          </Button>
          {state.loading && <Spinner inline={true} size={16} />}
          {state.lastExecutedAt && (
            <span className={styles.timestamp}>
              最後執行時間：{new Date(state.lastExecutedAt).toLocaleString()}
            </span>
          )}
        </HorizontalGroup>

        {state.connectionMessage && (
          <Alert title="MCP 狀態" severity={state.connectionSeverity ?? 'info'}>
            {state.connectionMessage}
          </Alert>
        )}

        {state.error && (
          <Alert title="執行失敗" severity="error">
            {state.error}
          </Alert>
        )}

        {state.rawResponse && !state.error && (
          <div>
            <div className={styles.resultHeader}>原始 JSON 結果</div>
            <pre className={styles.resultBlock}>{state.rawResponse}</pre>
          </div>
        )}
      </Stack>
    </div>
  );
}

function formatArgumentsForEditor(example?: Record<string, unknown>): string {
  if (!example) {
    return '{\n  \n}';
  }

  try {
    return JSON.stringify(example, null, 2);
  } catch (error) {
    console.error('範例參數無法轉換為 JSON 字串', error);
    return '{\n  \n}';
  }
}

function parseArgumentText(input: string): Record<string, unknown> {
  const trimmed = input.trim();

  if (trimmed === '') {
    return {};
  }

  const parsed = JSON.parse(trimmed);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('MCP 工具參數必須是 JSON 物件，請重新輸入。');
  }

  return parsed as Record<string, unknown>;
}

function extractErrorMessage(error: unknown): string {
  if (!error) {
    return '執行工具時發生未知錯誤，請稍後再試。';
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '執行工具時發生錯誤，請檢查瀏覽器主控台取得更多細節。';
}

function getStyles() {
  return {
    container: css`
      display: flex;
      flex-direction: column;
      gap: 16px;
    `,
    resultHeader: css`
      font-weight: 600;
      margin-bottom: 8px;
    `,
    resultBlock: css`
      background: var(--grafana-color-bg-strong);
      border-radius: 4px;
      padding: 12px;
      max-height: 420px;
      overflow: auto;
      font-family: var(--grafana-font-family-monospace);
      font-size: 12px;
      line-height: 1.5;
    `,
    timestamp: css`
      font-size: 12px;
      color: var(--grafana-color-text-secondary);
    `,
    inlineCode: css`
      background: var(--grafana-color-bg-strong);
      padding: 8px;
      border-radius: 4px;
      display: inline-block;
      margin-top: 4px;
      font-family: var(--grafana-font-family-monospace);
    `,
  };
}
