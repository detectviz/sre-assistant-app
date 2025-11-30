import type { SceneQueryRunner } from '@grafana/scenes';
import type { MllmClient } from '@grafana/llm';

export interface LokiQueryArgs {
  expr: string;
}

export const handleLokiChat = async (
  message: string,
  mllm: MllmClient,
  queryRunner: SceneQueryRunner,
  timeRange: { from: string; to: string }
) => {
  const contextMessage = `Grafana time range is: from=${timeRange.from}, to=${timeRange.to}.`;
  const fullMessage = `${contextMessage}\n\nUser query: ${message}`;

  const response = await mllm.llm.chat({
    messages: [{ role: 'user', content: fullMessage }],
    tools: [{ type: 'loki:query' }],
  });

  const toolCall = response.choices[0].message.tool_calls?.[0];
  if (toolCall?.function.name !== 'loki:query') {
    return;
  }

  try {
    const args = JSON.parse(toolCall.function.arguments) as LokiQueryArgs;

    // Update the query runner with the generated Loki query
    queryRunner.setState({
      queries: [{
        refId: 'A',
        expr: args.expr,
        queryType: 'range',
      }]
    });

    queryRunner.runQueries();
  } catch (error) {
    console.error('Failed to parse tool arguments:', error);
  }
};
