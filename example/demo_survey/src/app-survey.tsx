import runClientApp from 'evolution-legacy/lib/apps/participant/client';
import { EvolutionApplicationConfiguration } from 'evolution-frontend/lib/config/application.config';
import { setApplicationConfiguration } from 'chaire-lib-frontend/lib/config/application.config';

import surveySections from './survey/sections';
import * as widgetsConfig from './survey/widgets';
import projectHelpers from './survey/helper';

setApplicationConfiguration<EvolutionApplicationConfiguration>({
    sections: surveySections,
    widgets: widgetsConfig as any,
    projectHelpers,
    allowedUrlFields: ['source', 'household.carNumber']
});

runClientApp();