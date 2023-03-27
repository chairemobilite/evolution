import slugify from 'slugify';
import camelCase from 'lodash.camelcase';
import cloneDeep from 'lodash.clonedeep';
import fs from 'fs';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import {
    TranslationText,
    Choice,
    Question,
    Section,
    Validation
} from './questionnaireTypes';


const genericValidations: { [key: string]: ((value: any) => Validation) } = {
    required: (value) => {
        return {
            validation: _isBlank(value),
            errorMessage: {
                fr: 'Cette réponse est requise.',
                en: 'This answer is required.'
            }
        };
    },
    greaterThanZero: (value) => {
        return {
            validation: value >= 0,
            errorMessage: {
                fr: 'Cette valeur doit être plus grande que 0.',
                en: 'This value must be greater than 0.'
            }
        };
    },
    integer: (value) => {
        return {
            validation: Number.isInteger(Number(value)),
            errorMessage: {
                fr: 'Cette valeur doit être un nombre entier.',
                en: 'This value must be a whole number.'
            }
        };
    },
    number: (value) => {
        return {
            validation: !Number.isNaN(Number(value)),
            errorMessage: {
                fr: 'Cette valeur doit être un nombre valide.',
                en: 'This value must be a valid number.'
            }
        };
    },

};

const sliderLabels: { [key: string]: TranslationText[] } = {
    disagreeAgree: [
        { fr: 'Fortement en désaccord', en: 'Strongly Disagree' },
        { fr: 'Fortement en accord', en: 'Strongly Agree' },
    ],
    weakStrong: [
        { fr: 'Très faible', en: 'Very weak' },
        { fr: 'Très fort', en: 'Very strong' },
    ],
    poorGood: [
        { fr: 'Très mauvais', en: 'Very bad' },
        { fr: 'Très bon', en: 'Very good' },
    ],
    decreasedIncrease: [
        { fr: 'Considérablement diminué', en: 'Substantially decreased' },
        { fr: 'Considérablement augmenté', en: 'Substantially increased' },
    ],
    declinedImproved: [
        { fr: 'Considérablement déterioré', en: 'Substantially declined' },
        { fr: 'Considérablement amélioré', en: 'Substantially improved' },
    ],
    unsatisfiedSatisfied: [
        { fr: 'Très insatisfait(e)', en: 'Very unsatisfied' },
        { fr: 'Très satisfait(e)', en: 'Very satisfied' },
    ],
    neverOften: [
        { fr: 'Jamais', en: 'Never' },
        { fr: 'Très souvent', en: 'Very often' },
    ],
};
const parseSection = (line: string): Section | null => {
    if (/^#{2}\s+/.test(line)) {
        const [letterAndFrLabel, enLabel] = line.replace(/^#{2}\s+/, '').split(/\s*\|\s*/);
        const letter = letterAndFrLabel.match(/^[A-Za-z]/)?.[0] || undefined;
        const frLabel = letterAndFrLabel.replace(/^[A-Za-z]\./, '').trim();
        const slugifiedEnLabel = slugify(camelCase(enLabel.trim()), { lower: false, strict: true });
        return {
            letter,
            shortname: slugifiedEnLabel,
            label: {
                fr: frLabel.trim(),
                en: enLabel.trim(),
            },
            questions: []
        };
    }
    return null;
};

const parseChoice = (line: string): Choice | null => {
    if (/^-\s+/.test(line)) {
        const [frLabel, enLabel] = line.replace(/^-/, '').split(/\s*\|\s*/);
        const slugifiedEnLabel = slugify(camelCase(enLabel.trim()), { lower: false, strict: true });

        return {
            value: slugifiedEnLabel,
            label: {
                fr: frLabel.trim(),
                en: enLabel.trim(),
            },
        };
    }
    return null;
};



const parseQuestion = (line: string): Question | null => {
    if (/^#{3}\s+/.test(line)) {
        const [frLabel, enLabel] = line.replace(/^#{3}\s+/, '').split(/\s*\|\s*/);
        const slugifiedEnLabel = slugify(camelCase(enLabel.trim()), { lower: false, strict: true });

        // Extract the question number and remove it from the French label
        const frLabelMatch = frLabel.trim().match(/^(\d+)\.\s+(.*)/);
        const number = frLabelMatch ? Number(parseInt(frLabelMatch[1], 10)) : undefined;
        const newFrLabel = frLabelMatch ? frLabelMatch[2].trim() : frLabel.trim();

        return {
            shortname: slugifiedEnLabel,
            label: {
                fr: newFrLabel,
                en: enLabel.trim(),
            },
            number,
            choices: [],
            metadata: {},
        };
    }
    return null;
};

const parseMetadata = (lines: string[]): { [key: string]: any } => {
    const metadata: { [key: string]: any } = {};

    for (const line of lines) {
        const [key, value] = line.split(':');
        const trimmedKey = key.trim();
        const trimmedValue = value.trim();

        if (trimmedKey === 'validate') {
            const validations = trimmedValue.split(/\s*&&\s*/);
            metadata[trimmedKey] = validations.map((validationName) => {
                if (genericValidations[validationName]) {
                    return genericValidations[validationName];
                } else {
                    throw new Error(`Unknown validation: ${validationName}`);
                }
            });
        } else {
            metadata[trimmedKey] = trimmedValue;
        }
    }

    return metadata;
};


const parseQuestionnaireFromMarkdown = (markdownContent: string) => {

    const sections: { [key: string]: Section } = {};

    const lines = markdownContent.split(/\r?\n/);
    let metadataLines: string[] = [];
    let inMetadataBlock = false;

    let currentQuestion: Question | undefined = undefined;
    let currentSection: Section | undefined = undefined;

    lines.forEach((line) => {
        // Process sections
        const section = parseSection(line);
        if (section) {
            currentSection = section;
            sections[section.shortname] = currentSection;
        }

        // Process questions
        const question = parseQuestion(line);
        if (question) {
            currentQuestion = question;
        }

        // Process choices
        const choice = parseChoice(line);
        if (choice && currentQuestion) {
            currentQuestion.choices.push(choice);
        }

        // Process metadata
        if (line.trim() === '<!--') {
            inMetadataBlock = true;
        } else if (line.trim() === '-->' && currentQuestion && currentSection) {
            inMetadataBlock = false;
            currentQuestion.metadata = parseMetadata(metadataLines);
            currentSection.questions.push(cloneDeep(currentQuestion));
            metadataLines = [];
        } else if (inMetadataBlock) {
            metadataLines.push(line);
        }

    });

    return sections;
};

const generateCode = (sections: { [key: string]: Section }) => {
    const codeBySection: { [key: string]: string } = {};

    Object.values(sections).forEach((section: Section) => {
        let code = '';
        section.questions.forEach((question: Question) => {
            const metadata = question.metadata;
            const shortname = slugify(camelCase(metadata.shortname.trim()), { lower: false, strict: true });
            code += `export const ${shortname} = {\n`;
            code += `  type: "${metadata.type}",\n`;
            code += `  inputType: "${metadata.input}",\n`;
            code += `  datatype: "${metadata.datatype}",\n`;
            code += `  path: '${metadata.object}.${shortname}',\n`;
            code += question.number ? `  number: ${question.number},\n` : '';

            if (metadata.validate) {
                code += `  validations: [${metadata.validate}],\n`;
            }

            code += '  label: {\n';
            code += `    fr: "${question.label.fr}",\n`;
            code += `    en: "${question.label.en}"\n`;
            code += '  },\n';

            if (question.choices.length > 0) {
                code += '  choices: [\n';

                question.choices.forEach((choice: Choice) => {
                    code += '    {\n';
                    code += `      value: "${choice.value}",\n`;
                    code += '      label: {\n';
                    code += `        fr: "${choice.label.fr}",\n`;
                    code += `        en: "${choice.label.en}"\n`;
                    code += '      }\n';
                    code += '    },\n';
                });

                code += '  ],\n';
            }

            code += '};\n\n';
        });
        codeBySection[section.shortname] = code;
    });

    return codeBySection;
};

// Usage example:
const mdText = `
# Questionnaire

## A. Domicile|Home

### 1. Taille du ménage|Household size
En vous incluant, combien de personnes vivent en permanence dans votre ménage ou votre appartement?|
Including yourself, how many people permanently live in your household or flat?
<!--
type: question
input: string
datatype: integer
object: household
validate: required && integer
shortname: household_size
-->

### 2. Type de stationnements|Car parking facilities
Quels types de stationnements sont à votre disposition?|
Which car parking facilities is available to you?
- Stationnement sécurisé gratuit|Free secure parking
- Stationnement sécurisé payant|Paid secure parking
- Suffisamment d'espaces publics gratuits|Sufficient free public spaces
- Stationnements payants en nombre suffisant|Sufficient paid parking spaces
<!--
type: question
input: multiselect
datatype: string
object: home
validate: required
shortname: home_parkings
-->`;

const headers = `
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
`;

const sections = parseQuestionnaireFromMarkdown(mdText);
const sectionCodeByShortname = generateCode(sections);
for (const sectionShortname in sectionCodeByShortname) {
    fs.writeFileSync(`${sectionShortname}.ts`, `${headers}\n\n${sectionCodeByShortname[sectionShortname]}`);
}
