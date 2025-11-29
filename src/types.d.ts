// This file is used to declare placeholder types for Grafana Enterprise modules that are not available on the public npm registry.
// This allows the plugin to be compiled without having access to the full enterprise dependencies.

declare module '@grafana/llm' {
  import { SceneObjectBase } from '@grafana/scenes';
  import React from 'react';

  // Placeholder for the MllmClient
  export class MllmClient {
    constructor(options: { appUrl: string });
    llm: {
      chat: (options: { messages: Array<{ role: 'user' | 'system' | 'assistant'; content: string }>; tools?: any[] }) => Promise<any>;
    };
  }

  // Placeholder for the MllmChat scene object
  export class MllmChat extends SceneObjectBase<{}> {
    constructor(options: { title?: string; onSend?: (message: string) => void });
  }
}
