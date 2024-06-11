import runClientApp from 'evolution-legacy/lib/apps/admin/client';
import { setApplicationConfiguration } from 'chaire-lib-frontend/lib/config/application.config';
import { EvolutionApplicationConfiguration } from 'evolution-frontend/lib/config/application.config';

import surveySections from '../survey/sections';
import * as widgetsConfig from '../survey/widgets';
import projectHelpers from '../survey/helper';
import validations from './validations';
import parsers from './parsers'

setApplicationConfiguration<EvolutionApplicationConfiguration>({
    sections: surveySections,
    widgets: widgetsConfig as any,
    allowedUrlFields: ['source', 'household.carNumber'],
    // TODO See if the demo is wrong or the admin validation types
    getAdminValidations: () => validations as any,
    projectHelpers,
    getParsers: () => parsers
});

runClientApp();