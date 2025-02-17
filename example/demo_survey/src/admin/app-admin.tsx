import runClientApp from 'evolution-legacy/lib/apps/admin/client';
import { setApplicationConfiguration } from 'chaire-lib-frontend/lib/config/application.config';
import appConfig, { EvolutionApplicationConfiguration } from 'evolution-frontend/lib/config/application.config';

import surveySections from '../survey/sections';
import * as widgetsConfig from '../survey/widgets';
import projectHelpers from '../survey/helper';
import VisitedPlaceSection from '../survey/templates/VisitedPlacesSection';

setApplicationConfiguration<EvolutionApplicationConfiguration>({
    sections: surveySections,
    widgets: widgetsConfig as any,
    allowedUrlFields: ['source', 'household.carNumber'],
    projectHelpers,
    templateMapping: { ...appConfig.templateMapping, 'visitedPlaces': VisitedPlaceSection }
});

runClientApp();