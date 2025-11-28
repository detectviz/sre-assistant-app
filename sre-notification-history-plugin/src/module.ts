import { AppPlugin } from '@grafana/data';
import { NotificationHistoryPage } from './pages/NotificationHistoryPage';

export const plugin = new AppPlugin().setRootPage(NotificationHistoryPage);
