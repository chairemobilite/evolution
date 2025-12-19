/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { default as config } from 'chaire-lib-backend/lib/config/server.config';
import defineDefaultRoles from '../../services/auth/roleDefinition';
import { default as knex } from 'chaire-lib-backend/lib/config/shared/db.config';

import {} from 'express';
import { Knex } from 'knex';
import { PassportStatic } from 'passport';
import path from 'path';
import _camelCase from 'lodash/camelCase';
import express, { Express, Request, Response, NextFunction } from 'express';
import favicon from 'serve-favicon';
import expressSession from 'express-session';
import KnexConnection from 'connect-session-knex';
import morgan from 'morgan';
import trRoutingRouter from 'chaire-lib-backend/lib/api/trRouting.routes';
import { userAuthModel } from 'chaire-lib-backend/lib/services/auth/userAuthModel';
import adminRoutes from '../../api/admin.routes';
import configurePassport from 'chaire-lib-backend/lib/config/auth';
import requestIp from 'request-ip';
import { directoryManager } from 'chaire-lib-backend/lib/utils/filesystem/directoryManager';
import authRoutes from 'chaire-lib-backend/lib/api/auth.routes';
import surveyRoutes from './routes';
import { hasFileExtension } from '../../services/routing/urlHelpers';

export const setupServerApp = (app: Express, serverSetupFct?: (app: Express) => void) => {
    const publicDirectory = path.join(__dirname, '..', '..', '..', '..', '..', 'public');
    const publicDistDirectory = path.join(publicDirectory, 'dist', config.projectShortname, 'admin');
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
    const publicPath = express.static(publicDistDirectory);
    const localePath = express.static(localeDirectory);

    const KnexSessionStore = KnexConnection(expressSession);
    const sessionStore = new KnexSessionStore({
        knex: knex as Knex,
        tablename: 'sessions'
    });

    const session = expressSession({
        name: 'evsession_admin_' + _camelCase(config.projectShortname),
        secret: process.env.EXPRESS_SESSION_SECRET_KEY as string,
        resave: false,
        saveUninitialized: false,
        store: sessionStore
    });

    const passport = configurePassport(userAuthModel) as PassportStatic;

    app.use(
        morgan('combined', {
            skip: (req: Request, _res: Response) => req.url.indexOf('nolog=true') !== -1
        })
    );
    app.use(express.json({ limit: '500mb' }));
    app.use(express.urlencoded({ limit: '500mb', extended: true }));
    app.use(session);
    app.use(requestIp.mw());
    app.use(favicon(path.join(publicDirectory, 'favicon.ico')));
    app.use(passport.initialize());
    app.use(passport.session());

    authRoutes(app, userAuthModel, passport);

    app.set('trust proxy', true);

    app.get(/.*\.js$/, (req: Request, res: Response, next: NextFunction) => {
        req.url = req.url + '.gz';
        res.set('Content-Encoding', 'gzip');
        res.set('Content-Type', 'text/javascript');
        next();
    });

    app.get(/.*\.css$/, (req: Request, res: Response, next: NextFunction) => {
        req.url = req.url + '.gz';
        res.set('Content-Encoding', 'gzip');
        res.set('Content-Type', 'text/css');
        next();
    });

    app.use('/locales/', localePath);
    app.use('/dist/', publicPath);

    try {
        if (typeof serverSetupFct === 'function') {
            serverSetupFct(app);
        }
    } catch (error) {
        console.log('Error running project specific server setup function: ', error);
    }

    surveyRoutes(app);
    trRoutingRouter(app);
    defineDefaultRoles();
    app.use('/api/admin', adminRoutes);

    app.get('/incompatible', (req: Request, res: Response) => {
        res.sendFile(path.join(publicDirectory, 'incompatible.html'));
    });

    app.get('/ping', (req: Request, res: Response) => {
        return res.status(200).json({
            status: 'online'
        });
    });

    // Catch-all route: serves the frontend SPA for all unmatched routes (client-side routing)
    // Returns 404 for file requests that weren't handled by previous routes
    app.get(/.*/, (req: Request, res: Response) => {
        // Clean URL (remove query parameters for matching)
        const pathname = req.url.split('?')[0];

        // If pathname ends with a file extension, return 404
        // Files that should be served have already been handled by previous routes
        if (hasFileExtension({ pathname })) {
            console.warn('Warning: file not found ', pathname);
            res.status(404).sendFile(indexPath);
        } else {
            res.status(200).sendFile(indexPath);
        }
    });

    return { app, session };
};

process.on('unhandledRejection', (err: Error) => {
    console.error(err.stack);
});

export default setupServerApp;
