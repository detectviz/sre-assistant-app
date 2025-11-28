// Copyright © 2024 Sre Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package main

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
)

/*
 * =============================================================================
 *  DATABASE SCHEMA (for SQLite, as an example)
 * =============================================================================
 *
 * CREATE TABLE IF NOT EXISTS notification_history (
 *   id INTEGER PRIMARY KEY AUTOINCREMENT,
 *   status TEXT NOT NULL, -- e.g., 'firing', 'resolved'
 *   labels TEXT, -- JSON blob of labels
 *   annotations TEXT, -- JSON blob of annotations
 *   starts_at DATETIME,
 *   ends_at DATETIME,
 *   generator_url TEXT,
 *   fingerprint TEXT,
 *   received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
 * );
 *
 */

// Notification represents a simplified structure for a Grafana alert notification.
type Notification struct {
	ID          int64             `json:"id"`
	Status      string            `json:"status"`
	Labels      map[string]string `json:"labels"`
	Annotations map[string]string `json:"annotations"`
	StartsAt    time.Time         `json:"startsAt"`
	EndsAt      time.Time         `json:"endsAt"`
	ReceivedAt  time.Time         `json:"receivedAt"`
}

// App is the main plugin entry point.
type App struct {
	backend.CallResourceHandler
}

// NewApp creates a new App instance.
func NewApp(_ context.Context, _ backend.AppInstanceSettings) (instancemgmt.Instance, error) {
	app := &App{}

	mux := http.NewServeMux()
	app.registerRoutes(mux)
	app.CallResourceHandler = httpadapter.New(mux)

	return app, nil
}

// registerRoutes creates a new HTTP multiplexer for notification resources.
func (a *App) registerRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/webhook", a.handleWebhook) // To be called by Grafana Contact Point
	mux.HandleFunc("/history", a.handleHistory) // To be called by the plugin frontend
}

// handleWebhook receives notifications from Grafana's contact point.
func (a *App) handleWebhook(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	// In a real implementation, we would parse the request body
	// and save it to the database.
	log.DefaultLogger.Info("Received a notification webhook")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Notification received"}`))
}

// handleHistory serves the stored notification history to the frontend.
func (a *App) handleHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	history := []Notification{
		{
			ID:       1,
			Status:   "firing",
			Labels:   map[string]string{"alertname": "High CPU Usage", "instance": "server1"},
			StartsAt: time.Now().Add(-1 * time.Hour),
		},
		{
			ID:       2,
			Status:   "resolved",
			Labels:   map[string]string{"alertname": "Disk Space Low", "instance": "server2"},
			StartsAt: time.Now().Add(-2 * time.Hour),
			EndsAt:   time.Now().Add(-30 * time.Minute),
		},
	}
	json.NewEncoder(w).Encode(history)
}


// CheckHealth, and Dispose helpers...
func (a *App) CheckHealth(_ context.Context, _ *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	return &backend.CheckHealthResult{Status: backend.HealthStatusOk, Message: "Plugin is running"}, nil
}
func (a *App) Dispose() {
	// cleanup
}
