import { WidgetConditional } from 'evolution-common/lib/services/questionnaire/types';

// Don't show Question and give 'Québec' as default value
export const hiddenWithQuebecAsDefaultValueCustomConditional: WidgetConditional = (_interview) => {
    return [false, 'Québec'];
};

// Don't show Question and give 'Canada' as default value
export const hiddenWithCanadaAsDefaultValueCustomConditional: WidgetConditional = (_interview) => {
    return [false, 'Canada'];
};
