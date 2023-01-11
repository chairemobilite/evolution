/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import inquirer from 'inquirer';
import { camelCase, lowerCase } from 'lodash';

const datatypeChoices = [
    'string',
    'integer',
    'float',
    'boolean'
].map(function(choice) {
    return {
        value: choice,
        name: choice
    };
});
const inputTypeChoices = [
    'string',
    'mapPoint',
    'radio',
    'checkbox',
    'button',
    'select',
    'multiselect',
    'time',
    'text',
    'datePicker',
    'slider'
].map(function(choice) {
    return {
        value: choice,
        name: choice
    };
});

export default async function() {

    const attributes = await inquirer.prompt([
        {
            type: 'input',
            name: 'prefix',
            message: 'Question prefix (before the path)'
        },
        {
            type: 'input',
            name: 'path',
            message: 'Path'
        },
        {
            type   : 'list',
            choices: inputTypeChoices,
            name   : 'inputType',
            message: 'Input type',
        },
        {
            type: 'list',
            choices: datatypeChoices,
            name: 'datatype',
            message: 'Datatype'
        },
        {
            type: 'input',
            name: 'labelFr',
            message: 'Label (fr)',
        },
        {
            type: 'input',
            name: 'labelEn',
            message: 'Label (en)',
        },
        {
            type: 'confirm',
            name: 'twoColumns',
            message: 'Show question on two columns (label on the left)'
        },
        {
            type: 'confirm',
            name: 'containsHtml',
            message: 'contains HTML'
        },
        {
            type: 'confirm',
            name: 'hasConditional',
            message: 'Has conditional(s)'
        },
        {
            type: 'confirm',
            name: 'hasValidations',
            message: 'Has validation(s)'
        }
        /*{
          type   : 'input',
          name   : 'type',
          message: 'Type (',
          root   : `projects/${process.env.PROJECT_SHORTNAME}/imports/`,
          pageSize: 20
        }*/
    ]);

    const splittedPath =  attributes.path.split('.');
    const pathSuffix = splittedPath[splittedPath.length-1];

    // Here we check if label strings needs interpolation(s)):
    const hasInterpolationsInLabel = attributes.labelFr.match(/[\$]/) || attributes.labelEn.match(/[\$]/);

    const hasChoices = attributes.inputType === 'select' || attributes.inputType === 'radio' || attributes.inputType === 'checkbox' || attributes.inputType === 'multiselect';

    let generatedQuestionStr = `export const ${camelCase(attributes.prefix + '_' + pathSuffix)} = {\n`;
    generatedQuestionStr += `    type: "question",\n`;
    generatedQuestionStr += `    path: "${attributes.path}",\n`;
    generatedQuestionStr += `    inputType: "${attributes.inputType}",\n`;
    generatedQuestionStr += `    datatype: "${attributes.datatype}",\n`;
    generatedQuestionStr += `    twoColumns: ${attributes.twoColumns},\n`;
    generatedQuestionStr += `    containsHtml: ${attributes.containsHtml},\n`;
    attributes.inputType === 'multiselect' ? generatedQuestionStr += `    multiple: true,\n`: '';
    generatedQuestionStr += `    label: {\n`;

    if (hasInterpolationsInLabel) {
        generatedQuestionStr += `        fr: function(interview, path) {\n`;
        generatedQuestionStr += `            // const value = surveyHelper.get(interview, path, "DEFAULT", '../ATTRIBUTE');\n`;
        generatedQuestionStr += `            return (\`${attributes.labelFr}\`);\n`;
        generatedQuestionStr += `        },\n`;
        generatedQuestionStr += `        en: function(interview, path) {\n`;
        generatedQuestionStr += `            // const value = surveyHelper.get(interview, path, "DEFAULT", '../ATTRIBUTE');\n`;
        generatedQuestionStr += `            return (\`${attributes.labelEn}\`);\n`;
        generatedQuestionStr += `        }\n`;
        generatedQuestionStr += `    }\n`;
    } else {
        generatedQuestionStr += `        fr: \`${attributes.labelFr}\`,\n`;
        generatedQuestionStr += `        en: \`${attributes.labelEn}\`\n`;
        generatedQuestionStr += `    }${attributes.hasConditional || attributes.hasValidations || hasChoices ? ',' : ''}\n`;
    }
    if (attributes.hasConditional) {
        generatedQuestionStr += `    conditional: function (interview, path) {\n`;
        generatedQuestionStr += `        // const value = surveyHelper.get(interview, path, "DEFAULT", '../ATTRIBUTE');\n`;
        generatedQuestionStr += `        return [true, null];\n`;
        generatedQuestionStr += `    }${attributes.hasValidations || hasChoices ? ',' : ''}\n`
    }
    if (attributes.hasValidations) {
        generatedQuestionStr += `    validations: function (value, customValue, interview, path, customPath) {\n`;
        generatedQuestionStr += `        return [{\n`;
        generatedQuestionStr += `            validation: _isBlank(value),\n`;
        generatedQuestionStr += `            errorMessage: {\n`;
        generatedQuestionStr += `                fr: \`Cette réponse est requise.\`,\n`;
        generatedQuestionStr += `                en: \`This field is required.\`\n`;
        generatedQuestionStr += `             }\n`;
        generatedQuestionStr += `         }];\n`;
        generatedQuestionStr += `    }${hasChoices ? ',' : ''}\n`;
    }

    if (hasChoices) {
        const choicesStrArray = [];
        let choicesComplete = false;
        let choicesIndex = 1;
        while (choicesComplete !== true) {
            const choiceAttributes = await inquirer.prompt([{
                    type: 'input',
                    name: 'value',
                    message: `Choice #${choicesIndex} value (enter "q" if there is no more choice)`
                },
                {
                    when: function(answers) {
                        return lowerCase(answers.value) !== 'q';
                    },
                    type: 'input',
                    name: 'labelFr',
                    message: 'Label (fr)',
                },
                {
                    when: function(answers) {
                        return lowerCase(answers.value) !== 'q';
                    },
                    type: 'input',
                    name: 'labelEn',
                    message: 'Label (en)',
                }
            ]);
            choicesIndex++;
            if (lowerCase(choiceAttributes.value) === 'q') {
                choicesComplete = true;
            } else {
                let choiceStr = `    {\n`;
                choiceStr += `        value: ${attributes.datatype === 'string' ? '`' : ''}${choiceAttributes.value}${attributes.datatype === 'string' ? '`' : ''},\n`;
                choiceStr += `        label: {\n`;
                choiceStr += `            fr: \`${choiceAttributes.labelFr}\`,\n`;
                choiceStr += `            en: \`${choiceAttributes.labelEn}\`\n`;
                choiceStr += `        }\n`;
                choiceStr += `    }`;
                choicesStrArray.push(choiceStr);
            }
        }
        generatedQuestionStr += `    choices: [\n`;
        for (let i = 0; i < choicesStrArray.length; i++) {
            const choiceStr = choicesStrArray[i];
            generatedQuestionStr +=`${choiceStr}${i < choicesStrArray.length - 1 ? ',' : ''}\n`;
        }
        generatedQuestionStr += `    ]\n`;
    }

    generatedQuestionStr += `};\n`;

    console.log(generatedQuestionStr);

}