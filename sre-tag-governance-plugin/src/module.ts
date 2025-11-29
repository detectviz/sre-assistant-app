import { AppPlugin } from '@grafana/data';
import { TagGovernancePage } from './pages/TagGovernancePage';

export const plugin = new AppPlugin().setRootPage(TagGovernancePage);
