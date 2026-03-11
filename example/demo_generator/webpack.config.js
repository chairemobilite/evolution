const path                    = require('path');
const { createParticipantWebpackConfig } = require('evolution-frontend/lib/utils/dev/webpackParticipant');

// Ensure server config is found regardless of cwd (fixes serve:dev when run from any directory)
if (!process.env.PROJECT_CONFIG) {
  process.env.PROJECT_CONFIG = path.join(__dirname, 'config.js');
}
require('chaire-lib-backend/lib/config/dotenv.config');

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

const configuration = require('chaire-lib-backend/lib/config/server.config');
const config = configuration.default ? configuration.default : configuration;

// Public directory from which files are served
const publicDirectory = path.join(__dirname, '..', '..', 'public');

module.exports = (env) => {

    const customStylesFilePath  = `${__dirname}/lib/styles/styles.scss`;
    const customLocalesFilePath = `${__dirname}/locales`;
    const includeDirectories    = [
        path.join(__dirname, 'lib', 'survey'),
        path.join(__dirname, 'locales'),
        path.join(__dirname, 'assets')
    ];

    const htmlPages = [{
        title: process.env.DEFAULT_TITLE || 'Evolution',
        noindex: process.env.NOINDEX === 'true',
        filename: path.join(`index-survey-${config.projectShortname}.html`),
        template: path.join(publicDirectory, 'index.html')
    }];

    return createParticipantWebpackConfig({
        env: env,
        projectSrcDir: __dirname,
        publicDirectory: publicDirectory,
        config: config,
        participantEntryFile: path.join(__dirname, 'lib', 'app-survey.js'),
        includeDirectories: includeDirectories,
        htmlPages,
        customStylesFilePath: customStylesFilePath,
        projectLocalesFilePath: customLocalesFilePath,
        extraEnvs: {
            EV_VARIANT: 'demo_generator'
        }
    });
};
