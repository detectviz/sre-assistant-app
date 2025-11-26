package sreagent

import (
	"context"
	"fmt"
	"iter"
	"strings"

	"github.com/google/uuid"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	"google.golang.org/adk/model/gemini"
	"google.golang.org/adk/runner"
	"google.golang.org/adk/session"
	"google.golang.org/adk/tool"
	"google.golang.org/adk/tool/mcptoolset"
	"google.golang.org/genai"
)

type SREAgent struct {
	agent   agent.Agent
	service session.Service
}

type Config struct {
	GeminiAPIKey string
	MCPEndpoint  string
}

func NewSREAgent(ctx context.Context, cfg Config) (*SREAgent, error) {
	// 初始化 MCP 工具集以透過 SSE 連接到本地 MCP 伺服器
	mcpEndpoint := cfg.MCPEndpoint
	if mcpEndpoint == "" {
		mcpEndpoint = "http://localhost:8000/sse"
	}

	mcpTransport := &mcp.SSEClientTransport{
		Endpoint: mcpEndpoint,
	}

	mcpConfig := mcptoolset.Config{
		Transport: mcpTransport,
	}

	mcpTools, err := mcptoolset.New(mcpConfig)
	if err != nil {
		// 記錄警告但不失敗，也許 MCP 伺服器尚未準備就緒
		backend.Logger.Warn("Failed to create mcp toolset", "error", err)
		// 如果需要，我們可以繼續而不使用工具，或返回錯誤。
		// 目前，我們返回錯誤，因為工具是必不可少的。
		return nil, fmt.Errorf("failed to create mcp toolset: %w", err)
	}

	// 初始化模型。
	apiKey := cfg.GeminiAPIKey
	if apiKey == "" {
		// 僅記錄警告，暫不返回錯誤，以允許插件在沒有密鑰的情況下加載（例如初始設置）
		backend.Logger.Warn("Gemini API Key is missing")
		apiKey = "dummy-key"
	}

	// 正確使用 ClientConfig
	genaiCfg := &genai.ClientConfig{
		APIKey: apiKey,
	}
	model, err := gemini.NewModel(ctx, "gemini-1.5-pro", genaiCfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create gemini client: %w", err)
	}

	// 定義代理配置
	agentConfig := llmagent.Config{
		Name:        "sre-assistant",
		Description: "An AI assistant for SRE tasks, capable of analyzing insights and incidents.",
		Model:       model,
		Toolsets:    []tool.Toolset{mcpTools},
		Instruction: "You are a helpful SRE assistant. Use the available tools to analyze observability data and manage incidents.",
	}

	llmAgent, err := llmagent.New(agentConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create llm agent: %w", err)
	}

	return &SREAgent{
		agent:   llmAgent,
		service: session.InMemoryService(),
	}, nil
}

// runAgent 執行代理單次對話並返回文字回應。
func (a *SREAgent) runAgent(ctx context.Context, input string) (string, error) {
	// 建立執行器
	r, err := runner.New(runner.Config{
		Agent:          a.agent,
		SessionService: a.service,
	})
	if err != nil {
		return "", fmt.Errorf("failed to create runner: %w", err)
	}

	// 為此無狀態分析請求生成唯一的會話 ID
	sessionID := uuid.New().String()
	userID := "user"

	// 建立使用者內容
	userMsg := genai.NewContentFromText(input, "user")

	// 執行代理
	var responseBuilder strings.Builder

	// runner.Run 返回一個迭代器 (iter.Seq2[*session.Event, error])
	// 我們對其進行迭代。
	next, stop := iter.Pull2(r.Run(ctx, userID, sessionID, userMsg, agent.RunConfig{}))
	defer stop()

	for {
		event, err, ok := next()
		if !ok {
			break
		}
		if err != nil {
			return "", err
		}

		// 尋找模型回應
		if event.Content != nil {
			for _, part := range event.Content.Parts {
				if part.Text != "" {
					responseBuilder.WriteString(part.Text)
				}
			}
		}
	}

	return responseBuilder.String(), nil
}

// AnalyzeInsight 對給定的洞察執行分析。
func (a *SREAgent) AnalyzeInsight(ctx context.Context, insightData string) (string, error) {
	prompt := fmt.Sprintf("Please analyze the following insight data:\n%s", insightData)
	return a.runAgent(ctx, prompt)
}

// EvalIncident 評估事件。
func (a *SREAgent) EvalIncident(ctx context.Context, incidentData string) (string, error) {
	prompt := fmt.Sprintf("Please evaluate the following incident:\n%s", incidentData)
	return a.runAgent(ctx, prompt)
}
