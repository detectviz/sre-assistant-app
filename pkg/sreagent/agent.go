package sreagent

import (
	"context"
	"fmt"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"google.golang.org/adk/agent"
	"google.golang.org/adk/agent/llmagent"
	"google.golang.org/adk/model"
	"google.golang.org/adk/model/gemini"
	"google.golang.org/adk/session"
	"google.golang.org/adk/tool"
	"google.golang.org/adk/tool/mcptoolset"
	"google.golang.org/genai"
)

// SREAgent is the main service for SRE AI capabilities.
type SREAgent struct {
	runner *AgentRunner
}

// NewSREAgent creates a new SREAgent with the given configuration.
func NewSREAgent(ctx context.Context, cfg Config) (*SREAgent, error) {
	// Initialize MCP Toolset
	mcpTools, err := createMCPToolset(cfg.MCPEndpoint)
	if err != nil {
		// Log warning but allow continuation (e.g., if MCP server is not ready)
		backend.Logger.Warn("Failed to create mcp toolset", "error", err)
		return nil, fmt.Errorf("failed to create mcp toolset: %w", err)
	}

	// Initialize Model
	llmModel, err := createGeminiModel(ctx, cfg.GeminiAPIKey)
	if err != nil {
		return nil, err
	}

	// Initialize Agent
	llmAgent, err := createLLMAgent(llmModel, mcpTools)
	if err != nil {
		return nil, err
	}

	// Initialize Runner
	// Note: currently using InMemoryService for session management.
	// In the future, this should be replaced with a persistent store.
	runner := NewAgentRunner(llmAgent, session.InMemoryService())

	return &SREAgent{
		runner: runner,
	}, nil
}

// AnalyzeInsight analyzes the provided insight data.
func (a *SREAgent) AnalyzeInsight(ctx context.Context, insightData string) (string, error) {
	prompt := fmt.Sprintf("Please analyze the following insight data:\n%s", insightData)
	return a.runner.Run(ctx, prompt)
}

// EvalIncident evaluates the provided incident data.
func (a *SREAgent) EvalIncident(ctx context.Context, incidentData string) (string, error) {
	prompt := fmt.Sprintf("Please evaluate the following incident:\n%s", incidentData)
	return a.runner.Run(ctx, prompt)
}

// --- Helper Functions for Initialization ---

func createMCPToolset(endpoint string) (tool.Toolset, error) {
	if endpoint == "" {
		endpoint = "http://localhost:8000/sse"
	}

	mcpTransport := &mcp.SSEClientTransport{
		Endpoint: endpoint,
	}

	mcpConfig := mcptoolset.Config{
		Transport: mcpTransport,
	}

	return mcptoolset.New(mcpConfig)
}

func createGeminiModel(ctx context.Context, apiKey string) (model.LLM, error) {
	if apiKey == "" {
		backend.Logger.Warn("Gemini API Key is missing")
		apiKey = "dummy-key"
	}

	genaiCfg := &genai.ClientConfig{
		APIKey: apiKey,
	}
	// TODO: Make model name configurable
	return gemini.NewModel(ctx, "gemini-1.5-pro", genaiCfg)
}

func createLLMAgent(llmModel model.LLM, tools tool.Toolset) (agent.Agent, error) {
	agentConfig := llmagent.Config{
		Name:        "sre-assistant",
		Description: "An AI assistant for SRE tasks, capable of analyzing insights and incidents.",
		Model:       llmModel,
		Toolsets:    []tool.Toolset{tools},
		Instruction: "You are a helpful SRE assistant. Use the available tools to analyze observability data and manage incidents.",
	}

	return llmagent.New(agentConfig)
}
