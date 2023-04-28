import runClientApp from 'evolution-legacy/lib/apps/participant/client';
import { SurveyAppConfig } from './config/application.config';
import { setApplicationConfiguration } from 'chaire-lib-frontend/lib/config/application.config';

import surveySections from './survey/sections';
import * as widgetsConfig from './survey/widgets';
import projectHelpers from './survey/helper';

setApplicationConfiguration<SurveyAppConfig>({
    sections: surveySections,
    widgets: widgetsConfig,
    projectHelpers,
});

runClientApp();