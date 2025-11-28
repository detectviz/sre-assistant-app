import React, { useEffect, useState } from 'react';
import { getBackendSrv } from '@grafana/runtime';
import { Page } from '@grafana/ui';

// Matches the Go struct in pkg/plugin.go
interface TagRule {
  id: number;
  name: string;
  description: string;
  entityType: string;
  tagKey: string;
  isMandatory: boolean;
}

const PLUGIN_ID = 'sre-tag-governance-plugin';

export function TagGovernancePage() {
  const [rules, setRules] = useState<TagRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const response = await getBackendSrv().get<TagRule[]>(`/api/plugins/${PLUGIN_ID}/resources/rules`);
        setRules(response);
      } catch (e: any) {
        setError(e.data?.message || 'Failed to fetch tag governance rules.');
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, []);

  return (
    <Page>
      <Page.Contents>
        <h1>Tag Governance Rules</h1>

        {loading && <p>Loading rules...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {!loading && !error && (
          <table className="filter-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Entity Type</th>
                <th>Tag Key</th>
                <th>Is Mandatory</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.name}</td>
                  <td>{rule.description}</td>
                  <td>{rule.entityType}</td>
                  <td>{rule.tagKey}</td>
                  <td>{rule.isMandatory ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Page.Contents>
    </Page>
  );
}
