import { type InputRangeType } from 'evolution-common/lib/services/questionnaire/types';

export const sliderTooShortToTooLong: Pick<
    InputRangeType,
    'labels' | 'minValue' | 'maxValue' | 'formatLabel' | 'trackClassName'
> = {
    labels: [
        {
            fr: 'Trop court',
            en: 'Too short'
        },
        {
            fr: 'Juste comme il faut',
            en: 'Just right'
        },
        {
            fr: 'Trop long',
            en: 'Too long'
        }
    ],
    minValue: -10,
    maxValue: 100,
    formatLabel: (value, language) => {
        return value < 0 ? '' : `${value} ${language === 'fr' ? '%' : language === 'en' ? '%' : ''}`;
    },
    trackClassName: 'input-slider-green-yellow-red'
};

export const sliderNotAtAllToVeryInteresting: Pick<
    InputRangeType,
    'labels' | 'minValue' | 'maxValue' | 'formatLabel' | 'trackClassName'
> = {
    labels: [
        {
            fr: 'Pas du tout',
            en: 'Not at all'
        },
        {
            fr: 'Neutre',
            en: 'Neutral'
        },
        {
            fr: 'Très intéressante',
            en: 'Very interesting'
        }
    ],
    minValue: -10,
    maxValue: 100,
    formatLabel: (value, language) => {
        return value < 0 ? '' : `${value} ${language === 'fr' ? '%' : language === 'en' ? '%' : ''}`;
    },
    trackClassName: 'input-slider-red-yellow-green'
};

export const sliderVeryEasyToVeryDifficult: Pick<
    InputRangeType,
    'labels' | 'minValue' | 'maxValue' | 'formatLabel' | 'trackClassName'
> = {
    labels: [
        {
            fr: 'Très facile',
            en: 'Very easy'
        },
        {
            fr: 'Modérément difficile',
            en: 'Moderately difficult'
        },
        {
            fr: 'Très difficile',
            en: 'Very difficult'
        }
    ],
    minValue: -10,
    maxValue: 100,
    formatLabel: (value, language) => {
        return value < 0 ? '' : `${value} ${language === 'fr' ? '%' : language === 'en' ? '%' : ''}`;
    },
    trackClassName: 'input-slider-green-yellow-red'
};

export const sliderNotAtAllToVeryBurdensome: Pick<
    InputRangeType,
    'labels' | 'minValue' | 'maxValue' | 'formatLabel' | 'trackClassName'
> = {
    labels: [
        {
            fr: 'Pas du tout',
            en: 'Not at all'
        },
        {
            fr: 'Modérément pénible',
            en: 'Moderately burdensome'
        },
        {
            fr: 'Très pénible',
            en: 'Very burdensome'
        }
    ],
    minValue: -10,
    maxValue: 100,
    formatLabel: (value, language) => {
        return value < 0 ? '' : `${value} ${language === 'fr' ? '%' : language === 'en' ? '%' : ''}`;
    },
    trackClassName: 'input-slider-green-yellow-red'
};
