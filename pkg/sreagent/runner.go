package sreagent

import (
	"context"
	"fmt"
	"iter"
	"strings"

	"github.com/google/uuid"
	"google.golang.org/adk/agent"
	"google.golang.org/adk/runner"
	"google.golang.org/adk/session"
	"google.golang.org/genai"
)

// AgentRunner encapsulates the logic for running an agent session.
type AgentRunner struct {
	agent   agent.Agent
	service session.Service
}

// NewAgentRunner creates a new AgentRunner.
func NewAgentRunner(a agent.Agent, s session.Service) *AgentRunner {
	return &AgentRunner{
		agent:   a,
		service: s,
	}
}

// Run executes the agent with the given input and returns the response as a string.
// This handles the streaming response internally.
func (ar *AgentRunner) Run(ctx context.Context, input string) (string, error) {
	// Create the ADK runner
	r, err := runner.New(runner.Config{
		Agent:          ar.agent,
		SessionService: ar.service,
	})
	if err != nil {
		return "", fmt.Errorf("failed to create runner: %w", err)
	}

	// Generate a unique session ID for this stateless request
	sessionID := uuid.New().String()
	userID := "user"

	// Create user content
	userMsg := genai.NewContentFromText(input, "user")

	var responseBuilder strings.Builder

	// Iterate over the stream
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
