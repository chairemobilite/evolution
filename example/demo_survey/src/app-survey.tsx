import runClientApp from 'evolution-frontend/lib/apps/participant';
import appConfig, { EvolutionApplicationConfiguration } from 'evolution-frontend/lib/config/application.config';
import { setApplicationConfiguration } from 'chaire-lib-frontend/lib/config/application.config';

import surveySections from './survey/sections';
import * as widgetsConfig from './survey/widgets';
import projectHelpers from './survey/helper';
import VisitedPlaceSection from './survey/templates/VisitedPlacesSection';

setApplicationConfiguration<EvolutionApplicationConfiguration>({
    sections: surveySections,
    widgets: widgetsConfig as any,
    projectHelpers: projectHelpers as any,
    allowedUrlFields: ['source', 'household.carNumber', 'accessCode'],
    templateMapping: { ...appConfig.templateMapping, 'visitedPlaces': VisitedPlaceSection }
});

runClientApp();