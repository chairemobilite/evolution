import runClientApp from 'evolution-frontend/lib/apps/admin';
import { setApplicationConfiguration } from 'chaire-lib-frontend/lib/config/application.config';
import appConfig, { EvolutionApplicationConfiguration } from 'evolution-frontend/lib/config/application.config';

import { surveySections, widgetsConfig } from '../survey/questionnaire';
import projectHelpers from '../survey/helper';

setApplicationConfiguration<EvolutionApplicationConfiguration>({
    sections: surveySections,
    widgets: widgetsConfig as any,
    allowedUrlFields: ['source', 'household.carNumber'],
    projectHelpers: projectHelpers as any,
    templateMapping: appConfig.templateMapping
});

runClientApp();
