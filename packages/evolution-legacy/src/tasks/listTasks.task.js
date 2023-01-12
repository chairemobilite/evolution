import 'chaire-lib-backend/lib/config/dotenv.config';

import inquirer   from 'inquirer';
import _camelCase from 'lodash.camelcase';
import path       from 'path';
import util       from 'util';
import glob       from 'glob';
import config from 'chaire-lib-backend/lib/config/server.config'
import { listTasks } from 'chaire-lib-backend/lib/scripts/listTasks';

const prGlob = util.promisify(glob);

const run = async function() {

  const tasksDirectoryAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'tasksDirectory',
      message: 'Select a task directory',
      choices: [
        {
          name: 'general',
          value: `${__dirname}/**/*.task.js`
        },
        {
          name: 'project',
          value: `${config.projectDirectory}/tasks/**/*.task.js`
        }
      ]
    }
  ]);


  const tasksFilePaths = await prGlob(tasksDirectoryAnswers.tasksDirectory);
  // transition tasks if the general was selected
  if (tasksDirectoryAnswers.tasksDirectory === `${__dirname}/**/*.task.js`) {
    tasksFilePaths.push(...listTasks());
  }

  const taskAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'taskFilepath',
      message: 'Select a task to run',
      choices: tasksFilePaths.map(function(taskFilePath) {
        return {
          name : path.basename(taskFilePath, '.task.js'),
          value: taskFilePath
        };
      })
    },
    {
      type: 'number',
      name: 'memoryNeeded',
      message: 'memoryNeeded (in Mb)',
      default: 4096
    }
  ]);

  console.log(`yarn babel-node --max-old-space-size=${taskAnswers.memoryNeeded} ${taskAnswers.taskFilepath}`);
  
  return;

};

run().then(function() {
  process.exit();
});