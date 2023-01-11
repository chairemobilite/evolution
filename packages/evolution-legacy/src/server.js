/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
require('@babel/register');

import './config/shared/dotenv.config';
import config from 'chaire-lib-backend/lib/config/server.config';
import { join } from 'path';
import createServerApp from './socketServerApp';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { registerTranslationDir, addTranslationNamespace } from 'chaire-lib-backend/lib/config/i18next';

const argv = yargs(hideBin(process.argv)).argv;

const useSSL = argv.ssl;
const port = argv.port ? parseInt(argv.port) : useSSL ? 8443 : 8080;

console.log(`starting server for project ${config.projectShortname} with port ${port}`);

process.on('uncaughtException', function(err) {
    // handle the error safely
    console.error("Just caught an uncaught exception!", err);
});

const { app, session } = require('./serverApp');
if (!useSSL) {
    // Create http server
    const http             = require('http');
    const server           = http.createServer(app);
    server.listen(port);
    createServerApp(server, session);
} else {
    // Create the https server
    const pk = process.env.SSL_PRIVATE_KEY;
    const crt = process.env.SSL_CERT;
    if (!pk || !crt) {
        console.error('Configuration error: you need to specify the SSL_PRIVATE_KEY and SSL_CERT keys in the .env file');
        process.exit();
    }
    const fs = require('fs');
    try {
        const privateKey  = fs.readFileSync(pk, 'utf8');
        const certificate = fs.readFileSync(crt, 'utf8');
        const https = require('https');
        const credentials = {key: privateKey, cert: certificate};
        const httpsServer = https.createServer(credentials, app);
        httpsServer.listen(port);
        createServerApp(httpsServer, session);
    } catch (err) {
        console.error("Error starting the https server: ", err);
        process.exit();
    }
}

// Register server translations
registerTranslationDir(join(__dirname, `../locales/${process.env.APP_NAME === 'survey' ? 'survey' : 'transition'}/`));
// FIXME Project directory is for runtime, locales should be in the config file (See #420)
registerTranslationDir(`${config.projectDirectory}/locales/`);
addTranslationNamespace('customServer');