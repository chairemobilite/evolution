const path = require('path');
const { createAdminWebpackConfig } = require('evolution-frontend/lib/utils/dev/webpackAdmin');

// Ensure server config is found regardless of cwd
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
    const customStylesFilePath = `${__dirname}/lib/styles/styles.scss`;
    const customLocalesFilePath = `${__dirname}/locales`;
    const includeDirectories = [
        path.join(__dirname, 'lib', 'admin'),
        path.join(__dirname, 'lib', 'survey'),
        path.join(__dirname, 'locales'),
        path.join(__dirname, 'assets')
    ];

    const htmlPages = [{
        title: process.env.DEFAULT_TITLE || 'Evolution - Admin',
        noindex: true, // we should never index the admin dashboard
        filename: path.join(`index-survey-${config.projectShortname}.html`),
        template: path.join(publicDirectory, 'index.html')
    }];

    return createAdminWebpackConfig({
        env: env,
        projectSrcDir: __dirname,
        publicDirectory: publicDirectory,
        config: config,
        adminEntryFile: path.join(__dirname, 'lib', 'admin', 'app-admin.js'),
        includeDirectories: includeDirectories,
        htmlPages,
        customStylesFilePath: customStylesFilePath,
        projectLocalesFilePath: customLocalesFilePath
    });
};
