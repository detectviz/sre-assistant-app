import React, { useEffect, useState } from 'react';
import { getBackendSrv } from '@grafana/runtime';
import { Page } from '@grafana/ui';

// Matches the Go struct in pkg/plugin.go
interface SilenceRule {
  id: number;
  name: string;
  description: string;
  matchers: string;
  startsAtCron: string;
  durationMinutes: number;
  isDisabled: boolean;
}

const PLUGIN_ID = 'sre-silence-rules-plugin';

export function SilenceRulesPage() {
  const [rules, setRules] = useState<SilenceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const response = await getBackendSrv().get<SilenceRule[]>(`/api/plugins/${PLUGIN_ID}/resources/rules`);
        setRules(response);
      } catch (e: any) {
        setError(e.data?.message || 'Failed to fetch silence rules.');
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, []);

  return (
    <Page>
      <Page.Contents>
        <h1>Recurring Silence Rules</h1>

        {loading && <p>Loading rules...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {!loading && !error && (
          <table className="filter-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>CRON Schedule</th>
                <th>Duration (Minutes)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.name}</td>
                  <td>{rule.description}</td>
                  <td>{rule.startsAtCron}</td>
                  <td>{rule.durationMinutes}</td>
                  <td>{rule.isDisabled ? 'Disabled' : 'Enabled'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Page.Contents>
    </Page>
  );
}
