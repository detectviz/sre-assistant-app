import { test, expect } from './fixtures';
import { ROUTES } from '../src/constants';

test.describe('navigating app', () => {
  test('Overview page should render successfully', async ({ gotoPage, page }) => {
    await gotoPage(`/${ROUTES.Overview}`);
    await expect(page.getByText('重新整理總覽')).toBeVisible();
  });

  test('Insight page should render successfully', async ({ gotoPage, page }) => {
    await gotoPage(`/${ROUTES.Insight}`);
    await expect(page.getByText('執行分析')).toBeVisible();
  });

  test('Incident page should render successfully', async ({ gotoPage, page }) => {
    await gotoPage(`/${ROUTES.Incident}`);
    await expect(page.getByText('執行告警評估')).toBeVisible();
  });
});
