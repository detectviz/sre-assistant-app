package health

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/sre/assistant/pkg/mcp"
)

/**
 * @section 5.2 系統健康檢查
 * 依據《docs/architecture.md》第 5.2 節，本模組負責建立 MCP 健康檢查探針，
 * 透過 MCP Server 的健康端點驗證 AI 工具鏈是否可用。
 */

type MCPProbeConfig struct {
	Client  *mcp.Client
	Timeout time.Duration
}

const defaultMCPTimeout = 5 * time.Second

// NewMCPProbe 回傳健康檢查函式，實際呼叫 MCP /health 端點。
func NewMCPProbe(cfg MCPProbeConfig) func(context.Context) error {
	return func(ctx context.Context) error {
		if cfg.Client == nil {
			return errors.New("MCP 客戶端未初始化")
		}

		timeout := cfg.Timeout
		if timeout <= 0 {
			timeout = defaultMCPTimeout
		}

		ctx, cancel := context.WithTimeout(ctx, timeout)
		defer cancel()

		if err := cfg.Client.Health(ctx); err != nil {
			return fmt.Errorf("MCP 健康檢查失敗: %w", err)
		}

		return nil
	}
}
