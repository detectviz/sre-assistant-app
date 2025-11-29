import { AppPlugin } from '@grafana/data';
import { SilenceRulesPage } from './pages/SilenceRulesPage';

export const plugin = new AppPlugin().setRootPage(SilenceRulesPage);
