
export type TranslationText = {
    fr: string;
    en: string;
}

export type Choice = {
    value: string;
    label: TranslationText;
}

export type Question = {
    shortname: string;
    label: TranslationText;
    number?: number,
    metadata: {
        [key: string]: string;
    };
    choices: Choice[];
}

export type Section = {
    shortname: string;
    letter?: string;
    label: TranslationText;
    questions: Question[];
}

export type Validation = {
    validation: ((value: any) => boolean) | boolean;
    errorMessage: TranslationText
}
