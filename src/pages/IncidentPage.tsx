import React, { useMemo } from 'react';
import { createIncidentScene } from '../scenes/IncidentScene';
import { PageLayout, AppSection } from './PageLayout';

/**
 * @description 對應 architecture.md 第 4.2 步驟 2，渲染 Incident Scene 並讓使用者進行告警評估。
 */
const IncidentPage: React.FC<{ activeSection?: AppSection }> = ({ activeSection = 'incident' }) => {
  const scene = useMemo(() => createIncidentScene(), []);
  const SceneRenderer = scene.Component;
  return (
    <PageLayout activeSection={activeSection} title="事件指揮">
      <SceneRenderer model={scene} />
    </PageLayout>
  );
};

export default IncidentPage;
