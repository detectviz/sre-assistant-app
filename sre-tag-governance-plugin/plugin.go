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
 * CREATE TABLE IF NOT EXISTS tag_governance_rules (
 *   id INTEGER PRIMARY KEY AUTOINCREMENT,
 *   name TEXT NOT NULL,
 *   description TEXT,
 *   entity_type TEXT NOT NULL, -- e.g., 'dashboard', 'datasource'
 *   tag_key TEXT NOT NULL,
 *   tag_value_regex TEXT, -- Optional regex for the tag value
 *   is_mandatory BOOLEAN NOT NULL DEFAULT 1,
 *   created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 *   updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
 * );
 *
 */

// TagRule defines the structure for a tag governance rule.
type TagRule struct {
	ID            int64     `json:"id"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	EntityType    string    `json:"entityType"` // 'dashboard' or 'datasource'
	TagKey        string    `json:"tagKey"`
	TagValueRegex string    `json:"tagValueRegex"`
	IsMandatory   bool      `json:"isMandatory"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
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
		rules := []TagRule{
			{ID: 1, Name: "Dashboard Team Tag", EntityType: "dashboard", TagKey: "team", IsMandatory: true},
			{ID: 2, Name: "Datasource Owner Tag", EntityType: "datasource", TagKey: "owner", IsMandatory: true},
		}
		json.NewEncoder(w).Encode(rules)
	case http.MethodPost:
		w.WriteHeader(http.StatusCreated)
		w.Write([]byte(`{"message": "Tag rule created"}`))
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (a *App) handleGetUpdateDeleteRule(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		rule := TagRule{ID: 1, Name: "Dashboard Team Tag", EntityType: "dashboard", TagKey: "team", IsMandatory: true}
		json.NewEncoder(w).Encode(rule)
	case http.MethodPut:
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"message": "Tag rule updated"}`))
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
