package mcp

import (
	"fmt"

	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/mcp-grafana/tools"
	"github.com/mark3labs/mcp-go/server"
)

// Settings contains configuration required by the MCP servers.
type Settings struct {
	// AccessToken is a Grafana Cloud access policy token that is exchanged with
	// one that can be used to authenticate with Grafana, if we're using on-behalf-of
	// auth.
	AccessToken string

	// ServiceAccountToken is the token provided by Grafana to the plugin,
	// and is used to authenticate with Grafana if we're not using on-behalf-of
	// auth.
	ServiceAccountToken string

	// Tenant is the Grafana Cloud tenant ID.
	Tenant string

	// IsGrafanaCloud indicates whether this is running in Grafana Cloud environment.
	IsGrafanaCloud bool
}

// MCP represents the complete MCP (Model Context Protocol) infrastructure for Grafana.
// It manages both the core MCP server and the Grafana Live server for handling
// real-time communication with MCP clients.
type MCP struct {
	// Server is the core MCP server that handles tool registration and execution.
	Server *server.MCPServer
	// LiveServer handles Grafana Live connections for MCP communication.
	LiveServer *GrafanaLiveServer
	// HTTPServer is the MCP Streamable HTTP server for handling MCP requests over HTTP
	// via plugin resource endpoints.
	HTTPServer *server.StreamableHTTPServer
	// Settings contains the configuration for the MCP servers.
	Settings Settings

	// accessTokenClient is the client for exchanging access policy tokens.
	// This is stored here because it may be shared by different Transports in the future.
	accessTokenClient *accessTokenClient
}

// New creates a new MCP instance with the provided settings and plugin version.
// It initializes the MCP server with all Grafana tools and sets up the Live server
// for handling real-time MCP communication.
func New(settings Settings, pluginVersion string) (*MCP, error) {
	log.DefaultLogger.Debug("Initializing MCP server")
	srv := server.NewMCPServer("grafana-llm-app", pluginVersion)
	tools.AddSearchTools(srv)
	tools.AddDatasourceTools(srv)
	tools.AddIncidentTools(srv)
	tools.AddPrometheusTools(srv)
	tools.AddLokiTools(srv)
	tools.AddAlertingTools(srv)
	tools.AddDashboardTools(srv)
	tools.AddOnCallTools(srv)
	tools.AddAssertsTools(srv)
	tools.AddSiftTools(srv)
	tools.AddFolderTools(srv)
	tools.AddAdminTools(srv)
	tools.AddPyroscopeTools(srv)
	tools.AddNavigationTools(srv)

	acc, err := newAccessTokenClient(settings.AccessToken, settings.Tenant, settings.IsGrafanaCloud)
	if err != nil {
		return nil, fmt.Errorf("failed to create access token client: %w", err)
	}

	liveServer := NewGrafanaLiveServer(srv, acc, WithIsGrafanaCloud(settings.IsGrafanaCloud))
	// We need to create the MCP struct before the HTTP server, because we need to
	// pass use a context func returned by one of the MCP struct's methods to the
	// HTTP server.
	m := &MCP{
		Server:            srv,
		LiveServer:        liveServer,
		Settings:          settings,
		accessTokenClient: acc,
	}
	m.HTTPServer = server.NewStreamableHTTPServer(srv,
		// Only allow Stateless mode.
		server.WithStateLess(true),
		server.WithLogger(&Logger{}),
		server.WithHTTPContextFunc(m.httpContextFunc()),
	)
	return m, nil
}

// Close shuts down the MCP instance, closing the Live server and cleaning up resources.
func (m *MCP) Close() {
	m.LiveServer.Close()
}
