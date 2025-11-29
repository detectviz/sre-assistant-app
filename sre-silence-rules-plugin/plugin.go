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
	"github.com/grafana/grafana-plugin-sdk-go/backend/resource/httpadapter"
)

/*
 * =============================================================================
 *  DATABASE SCHEMA (for SQLite, as an example)
 * =============================================================================
 *
 * CREATE TABLE IF NOT EXISTS silence_rules (
 *   id INTEGER PRIMARY KEY AUTOINCREMENT,
 *   name TEXT NOT NULL,
 *   description TEXT,
 *   matchers TEXT NOT NULL, -- JSON blob for Grafana Alertmanager matchers
 *   starts_at_cron TEXT NOT NULL, -- CRON expression for the start time
 *   duration_minutes INTEGER NOT NULL, -- Duration of the silence in minutes
 *   created_by TEXT NOT NULL,
 *   updated_by TEXT NOT NULL,
 *   created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 *   updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 *   is_disabled BOOLEAN NOT NULL DEFAULT 0
 * );
 *
 */

// SilenceRule defines the structure for a recurring silence rule.
type SilenceRule struct {
	ID              int64     `json:"id"`
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	Matchers        string    `json:"matchers"` // JSON string of matchers
	StartsAtCron    string    `json:"startsAtCron"`
	DurationMinutes int       `json:"durationMinutes"`
	CreatedBy       string    `json:"createdBy"`
	UpdatedBy       string    `json:"updatedBy"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
	IsDisabled      bool      `json:"isDisabled"`
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

func (a *App) registerRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/rules", a.handleListAndCreateRules)
	mux.HandleFunc("/rules/", a.handleGetUpdateDeleteRule)
}

func (a *App) handleListAndCreateRules(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		rules := []SilenceRule{
			{ID: 1, Name: "Rule 1", StartsAtCron: "0 0 * * *", DurationMinutes: 60},
			{ID: 2, Name: "Rule 2", StartsAtCron: "0 12 * * 1-5", DurationMinutes: 30},
		}
		json.NewEncoder(w).Encode(rules)
	case http.MethodPost:
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"message": "Silence rule created"}`))
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (a *App) handleGetUpdateDeleteRule(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		rule := SilenceRule{ID: 1, Name: "Rule 1", StartsAtCron: "0 0 * * *", DurationMinutes: 60}
		json.NewEncoder(w).Encode(rule)
	case http.MethodPut:
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"message": "Silence rule updated"}`))
	case http.MethodDelete:
		w.WriteHeader(http.StatusNoContent)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// CheckHealth is called by Grafana to check the plugin's health.
func (a *App) CheckHealth(_ context.Context, _ *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Plugin is running",
	}, nil
}

// Dispose tells plugin SDK that plugin wants to clean up resources when a new instance created.
func (a *App) Dispose() {
	// cleanup
}
