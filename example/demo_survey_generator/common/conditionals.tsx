import { createConditionals } from 'generator/lib/helpers/createConditionals';
import { Conditional } from 'generator/lib/types/inputTypes';

export const ifRadioYesConditional: Conditional = (interview) => {
    return createConditionals({
        interview,
        conditionals: [
            {
                path: 'home.doYouHaveChild',
                comparisonOperator: '===',
                value: 'yes',
            }
        ]
    });
};
