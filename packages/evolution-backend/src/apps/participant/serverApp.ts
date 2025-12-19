/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import config from 'chaire-lib-backend/lib/config/server.config';
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import path from 'path';
import _camelCase from 'lodash/camelCase';
import express, { Express } from 'express';
import favicon from 'serve-favicon';
import expressSession from 'express-session';
import KnexConnection from 'connect-session-knex';
import morgan from 'morgan'; // http logger
import trRoutingRouter from 'chaire-lib-backend/lib/api/trRouting.routes';
import { participantAuthModel } from '../../services/auth/participantAuthModel';
import configurePassport from '../../services/auth/auth.config';
import requestIp from 'request-ip';
import { directoryManager } from 'chaire-lib-backend/lib/utils/filesystem/directoryManager';
import { fileManager } from 'chaire-lib-backend/lib/utils/filesystem/fileManager';
import authRoutes from '../../api/auth.routes';
import participantRoutes from '../../apps/participant/routes';
import { hasFileExtension } from '../../services/routing/urlHelpers';
import { isSurveyEnded } from '../../services/surveyStatus/surveyStatus';

export const setupServerApp = (app: Express, serverSetupFct: (() => void) | undefined = undefined) => {
    // Public directory from which files are served
    const publicDirectory = path.join(__dirname, '..', '..', '..', '..', '..', 'public');
    const publicDistDirectory = path.join(publicDirectory, 'dist', config.projectShortname, 'survey');
    // Local path where locales are stored
    const localeDirectory = path.join(__dirname, '..', '..', '..', '..', '..', 'locales');

    directoryManager.createDirectoryIfNotExistsAbsolute(publicDistDirectory);
    directoryManager.createDirectoryIfNotExists('logs');
    directoryManager.createDirectoryIfNotExists('imports');
    directoryManager.createDirectoryIfNotExists('cache');
    directoryManager.createDirectoryIfNotExists('exports');
    directoryManager.createDirectoryIfNotExists('parsers');
    directoryManager.createDirectoryIfNotExists('tasks');

    const indexPath = path.join(
        publicDistDirectory,
        `index-survey-${config.projectShortname}${process.env.NODE_ENV === 'test' ? '_test' : ''}.html`
    );
    const surveyEndedIndexPotentialPath = path.join(
        publicDistDirectory,
        `index-survey-ended-${config.projectShortname}${process.env.NODE_ENV === 'test' ? '_test' : ''}.html`
    );
    // Validate that surveyEndedIndexPath exists and fallback to indexPath if not
    const surveyEndedIndexPath = fileManager.fileExistsAbsolute(surveyEndedIndexPotentialPath)
        ? surveyEndedIndexPotentialPath
        : indexPath;
    const notFound404Path = path.join(publicDirectory, 'notFound404.html');
    const publicPath = express.static(publicDistDirectory);
    const localePath = express.static(localeDirectory);

    const KnexSessionStore = KnexConnection(expressSession);
    const sessionStore = new KnexSessionStore({
        knex: knex,
        tablename: 'sessions' // optional. Defaults to 'sessions'
    });

    const session = expressSession({
        name: 'evsession_' + _camelCase(config.projectShortname),
        secret: process.env.EXPRESS_SESSION_SECRET_KEY as string,
        resave: false,
        saveUninitialized: false,
        store: sessionStore
    });
    const passport = configurePassport(participantAuthModel);

    app.use(
        morgan('combined', {
            // do not log if nolog=true is part of the url params:
            // FIXME Why would we want to skip logging?
            skip: function (req, _res) {
                return req.url.indexOf('nolog=true') !== -1;
            }
        })
    );
    app.use(express.json({ limit: '500mb' }));
    app.use(express.urlencoded({ limit: '500mb', extended: true }));
    app.use(session);
    app.use(requestIp.mw()); // to get users ip addresses
    app.use(favicon(path.join(publicDirectory, 'favicon.ico')));
    app.use(passport.initialize());
    app.use(passport.session());

    // TODO: move all routes to socket routes:
    authRoutes(app, participantAuthModel, passport);

    app.set('trust proxy', true); // allow nginx or other proxy server to send request ip address

    // send js and css compressed (gzip) to save bandwidth:
    app.get(/.*\.js$/, (req, res, next) => {
        req.url = req.url + '.gz';
        res.set('Content-Encoding', 'gzip');
        res.set('Content-Type', 'text/javascript');
        next();
    });

    app.get(/.*\.css$/, (req, res, next) => {
        req.url = req.url + '.gz';
        res.set('Content-Encoding', 'gzip');
        res.set('Content-Type', 'text/css');
        next();
    });

    app.use('/locales/', localePath); // this needs to be after gzip middlewares.

    app.use('/dist/', publicPath); // this needs to be after gzip middlewares.

    // TODO Let the survey project's server.js file do this
    try {
        if (typeof serverSetupFct === 'function') {
            serverSetupFct();
        }
    } catch (error) {
        console.log('Error running project specific server setup function: ', error);
    }
    participantRoutes(app);
    // Add the trRouting routes
    trRoutingRouter(app);

    app.get('/incompatible', (req, res) => {
        res.sendFile(path.join(publicDirectory, 'incompatible.html'));
    });

    app.get('/ping', (req, res) => {
        return res.status(200).json({
            status: 'online'
        });
    });

    // Catch-all route: serves the frontend SPA for all unmatched routes (client-side routing)
    // Returns 404 for extension file requests that weren't handled by previous routes
    app.get(/.*/, (req, res) => {
        // Clean URL (remove query parameters for matching)
        const pathname = req.url.split('?')[0];
        // If pathname ends with a file extension, return 404
        // Files that should be served have already been handled by previous routes
        if (hasFileExtension({ pathname })) {
            console.warn('Warning: file not found ', pathname);
            res.status(404).sendFile(notFound404Path);
        } else if (isSurveyEnded()) {
            // Check if survey has ended and serve appropriate app
            res.status(200).sendFile(surveyEndedIndexPath);
        } else {
            res.status(200).sendFile(indexPath);
        }
    });

    return { app, session };
};

process.on('unhandledRejection', (err) => {
    console.error(err);
});

export default setupServerApp;
