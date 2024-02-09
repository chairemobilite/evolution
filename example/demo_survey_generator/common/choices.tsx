import { Choices } from 'generator/lib/types/inputTypes';
import * as conditionals from './conditionals';

export const yesNoChoices: Choices = [
    {
        value: 'yes',
        label: {
            fr: 'Oui',
            en: 'Yes'
        }
    },
    {
        value: 'no',
        label: {
            fr: 'Non',
            en: 'No'
        }
    }
];

export const busCarTransport: Choices = [
    {
        value: 'bus',
        label: {
            fr: 'Autobus',
            en: 'Bus'
        }
    },
    {
        value: 'car',
        label: {
            fr: 'Voiture',
            en: 'Car'
        }
    }
];

export const transportModesChoices: Choices = [
    ...busCarTransport,
    {
        value: 'commuterTrain',
        label: {
            fr: 'Train de banlieu',
            en: 'Commuter train'
        }
    },
    {
        value: 'metro',
        label: {
            fr: 'Métro',
            en: 'Metro'
        }
    },
    {
        value: 'rem',
        label: {
            fr: 'REM',
            en: 'REM'
        }
    },
    {
        value: 'paratransit',
        label: {
            fr: 'Transport Adapté',
            en: 'Paratransit'
        }
    }
];

