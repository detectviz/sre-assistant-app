import React, { useMemo } from 'react';
import { createInsightScene } from '../scenes/InsightScene';
import { PageLayout, AppSection } from './PageLayout';

/**
 * @description 對應 architecture.md 第 4.2 步驟 2，渲染 Insight Scene 並供使用者操作。
 */
const InsightPage: React.FC<{ activeSection?: AppSection }> = ({ activeSection = 'insight' }) => {
  const scene = useMemo(() => createInsightScene(), []);
  const SceneRenderer = scene.Component;
  return (
    <PageLayout activeSection={activeSection} title="AI 洞察">
      <SceneRenderer model={scene} />
    </PageLayout>
  );
};

export default InsightPage;
