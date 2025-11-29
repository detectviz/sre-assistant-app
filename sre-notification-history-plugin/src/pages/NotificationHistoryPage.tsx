import React, { useEffect, useState } from 'react';
import { getBackendSrv } from '@grafana/runtime';
import { Page, Button } from '@grafana/ui';
import { NavLink } from 'react-router-dom';

// Matches the Go struct in pkg/plugin.go
interface Notification {
  id: number;
  status: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string; // Assuming ISO string format from backend
}

const PLUGIN_ID = 'sre-notification-history-plugin';
const ASSISTANT_PLUGIN_ID = 'sre-assistant-app';

export function NotificationHistoryPage() {
  const [history, setHistory] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await getBackendSrv().get<Notification[]>(`/api/plugins/${PLUGIN_ID}/resources/history`);
        setHistory(response);
      } catch (e: any) {
        setError(e.data?.message || 'Failed to fetch notification history.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const handleAnalyzeClick = (notification: Notification) => {
    // This is a placeholder for the actual navigation logic.
    // In a real scenario, this would construct a URL with query parameters
    // to pass the context to the assistant app.
    const context = encodeURIComponent(JSON.stringify(notification.labels));
    const url = `/a/${ASSISTANT_PLUGIN_ID}/?context=${context}`;
    console.log(`Navigating to: ${url}`);
    // For now, we just log it. A real implementation would use react-router-dom's history.
  };

  return (
    <Page>
      <Page.Contents>
        <h1>Notification History</h1>

        {loading && <p>Loading history...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {!loading && !error && (
          <table className="filter-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Alert Name</th>
                <th>Instance</th>
                <th>Started At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id}>
                  <td>{item.status}</td>
                  <td>{item.labels['alertname'] || 'N/A'}</td>
                  <td>{item.labels['instance'] || 'N/A'}</td>
                  <td>{new Date(item.startsAt).toLocaleString()}</td>
                  <td>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAnalyzeClick(item)}
                      // In a real app, this would be a NavLink or use history.push
                    >
                      Analyze with SRE Assistant
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Page.Contents>
    </Page>
  );
}
