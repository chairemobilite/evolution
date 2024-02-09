import { InputRangeConfig } from 'generator/lib/types/inputTypes';

export const confidentInputRange: InputRangeConfig = {
    labels: [
        {
            fr: 'Pas du tout confiant',
            en: 'Not at all confident'
        },
        {
            fr: 'Très confiant',
            en: 'Very confident'
        }
    ],
    minValue: -10,
    maxValue: 100,
    formatLabel: (value, language) => {
        return value < 0 ? '' : `${value} ${language === 'fr' ? '%' : language === 'en' ? '%' : ''}`;
    }
};

