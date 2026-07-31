import runClientApp from 'evolution-frontend/lib/apps/admin';
import { setApplicationConfiguration } from 'chaire-lib-frontend/lib/config/application.config';
import appConfig, { EvolutionApplicationConfiguration } from 'evolution-frontend/lib/config/application.config';

import { surveySections, widgetsConfig } from '../survey/questionnaire';
import projectHelpers from '../survey/helper';

// TODO This is a workaround to get the links to the user, until some more complete solution is implemented (see https://github.com/chairemobilite/transition/issues/1516)
const pages = [
    ...appConfig.pages,
    { path: '/interviews', permissions: { Interviews: ['read', 'update'] }, title: 'survey:Interviewers' }
];

setApplicationConfiguration<EvolutionApplicationConfiguration>({
    sections: surveySections,
    widgets: widgetsConfig as any,
    allowedUrlFields: ['source', 'household.carNumber'],
    projectHelpers: projectHelpers as any,
    templateMapping: appConfig.templateMapping,
    pages
});

runClientApp();
