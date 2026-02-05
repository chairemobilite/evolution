/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import 'chaire-lib-backend/lib/config/dotenv.config';
import config from 'chaire-lib-backend/lib/config/server.config';
import { createServer as httpCreateServer } from 'http';
import { createServer as httpsCreateServer } from 'https';
import fs from 'fs';
import { join } from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { registerTranslationDir } from 'chaire-lib-backend/lib/config/i18next';
import express, { Express } from 'express';
import { setupServerApp } from './serverApp';

const argv = yargs(hideBin(process.argv)).parseSync();

const useSSL = typeof argv.ssl === 'boolean' ? argv.ssl : false;
const port = argv.port ? parseInt(argv.port as string) : useSSL ? 8443 : 8080;

console.log(`starting server for project ${config.projectShortname} with port ${port}`);

process.on('uncaughtException', (err: Error) => {
    console.error('Just caught an uncaught exception!', err);
});

// FIXME adminAuth is not a part of the config object, but it is a server-only
// configuration and should not go in the common config type. It is only used at
// this moment, so we may keep it here with any cast, or find a way to type it
// properly in server configuration.
if (!(config as any).adminAuth) {
    console.warn(
        'Configuration error: you need to specify the adminAuth key in the config.js file. Will use default values.'
    );
    (config as any).adminAuth = {
        localLogin: {
            registerWithPassword: true,
            registerWithEmailOnly: true,
            confirmEmail: false,
            forgotPasswordPage: true
        }
    };
}
config.auth = (config as any).adminAuth;
delete (config as any).adminAuth;

export const setupServer = (serverSetupFct?: (app: Express) => void) => {
    const app = express();
    setupServerApp(app, serverSetupFct);
    if (!useSSL) {
        const server = httpCreateServer(app);
        server.listen(port);
    } else {
        const pk = process.env.SSL_PRIVATE_KEY;
        const crt = process.env.SSL_CERT;
        if (!pk || !crt) {
            console.error(
                'Configuration error: you need to specify the SSL_PRIVATE_KEY and SSL_CERT keys in the .env file'
            );
            // eslint-disable-next-line n/no-process-exit
            process.exit();
        }
        try {
            const privateKey = fs.readFileSync(pk, 'utf8');
            const certificate = fs.readFileSync(crt, 'utf8');
            const credentials = { key: privateKey, cert: certificate };
            const httpsServer = httpsCreateServer(credentials, app);
            httpsServer.listen(port);
        } catch (err) {
            console.error('Error starting the https server: ', err);
            // eslint-disable-next-line n/no-process-exit
            process.exit();
        }
    }

    // Register server translations
    registerTranslationDir(join(__dirname, '../../../../../locales/'));
};

export default setupServer;
