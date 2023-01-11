/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import inquirer from 'inquirer';
import generateText from './generateWidgets/generateText';
import generateInfoMap from './generateWidgets/generateInfoMap';
import generateInfoMapDirection from './generateWidgets/generateInfoMapDirection';
import generateButton from './generateWidgets/generateButton';
import generateQuestion from './generateWidgets/generateQuestion';
import generateGroup from './generateWidgets/generateGroup';

//import inquirerFileTreeSelection from 'inquirer-file-tree-selection-prompt';




const run = async function() {
  
    const typeChoices = [
        'question',
        'text',
        'button',
        'group',
        'infoMap',
        'infoMapDirection',
    ].map(function(choice) {
        return {
            value: choice,
            name: choice
        };
    });

    const chooseType = await inquirer.prompt([
        {
            type   : 'list',
            choices: typeChoices,
            name   : 'type',
            message: 'Widget type',
        },
        /*{
          type   : 'input',
          name   : 'type',
          message: 'Type (',
          root   : `projects/${process.env.PROJECT_SHORTNAME}/imports/`,
          pageSize: 20
        }*/
    ]);

    let widgetFunction = null;
    switch(chooseType.type) {
        case 'text':    
            widgetFunction = generateText;
            break;
        case 'infoMap':
            widgetFunction = generateInfoMap;
            break;
        case 'infoMapDirection':
            widgetFunction = generateInfoMapDirection;
            break;
        case 'button':
            widgetFunction = generateButton;
            break;
        case 'question':
            widgetFunction = generateQuestion;
            break;
        case 'group':
            widgetFunction = generateGroup;
            break;
        default:
            console.error('invalid widget type');
    }

    if (typeof widgetFunction === 'function') {
        await widgetFunction();
    } else {
        console.error('invalid widget type');
    }


  
  };
  
  run().then(function() {
    console.log('complete');
    process.exit();
  }).catch(error => {
    console.error("Error", error);
    process.exit();
  });