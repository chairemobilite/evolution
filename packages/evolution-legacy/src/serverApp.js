/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
const config           = require('chaire-lib-backend/lib/config/server.config').default;
// TODO This is evolution specific
import defineDefaultRoles from 'evolution-backend/lib/services/auth/roleDefinition';
const knex             = require('chaire-lib-backend/lib/config/shared/db.config').default;
const path             = require('path');
const _camelCase        = require('lodash.camelcase');
const express          = require('express');
const favicon          = require('serve-favicon');
const expressSession   = require('express-session');
const KnexSessionStore = require('connect-session-knex')(expressSession);
const morgan           = require('morgan') // http logger
import trRoutingRouter from 'chaire-lib-backend/lib/api/trRouting.routes';
import { userAuthModel } from 'chaire-lib-backend/lib/services/auth/userAuthModel';

//const WebSocket        = require('ws');
const requestIp        = require('request-ip');

import { directoryManager } from 'chaire-lib-backend/lib/utils/filesystem/directoryManager';
import authRoutes from 'chaire-lib-backend/lib/api/auth.routes';

export const setupServerApp = (app, serverSetupFct = undefined) => {

    // Public directory from which files are served
    const publicDirectory = path.join(__dirname, '..', '..', '..', 'public');
    const publicDistDirectory = path.join(publicDirectory, 'dist', config.projectShortname);
    // Local path where locales are stored
    const localeDirectory = path.join(__dirname, '..', 'locales');

    directoryManager.createDirectoryIfNotExistsAbsolute(publicDistDirectory);
    directoryManager.createDirectoryIfNotExists('logs');
    directoryManager.createDirectoryIfNotExists('imports');
    directoryManager.createDirectoryIfNotExists('cache');
    directoryManager.createDirectoryIfNotExists('exports');
    directoryManager.createDirectoryIfNotExists('parsers');
    directoryManager.createDirectoryIfNotExists('tasks');

    const indexPath = path.join(publicDistDirectory, `index-survey-${config.projectShortname}${process.env.NODE_ENV === 'test' ? '_test' : ''}.html`);
    const publicPath = express.static(publicDistDirectory);
    const localePath = express.static(localeDirectory);

    const sessionStore = new KnexSessionStore({
        knex     : knex,
        tablename: 'sessions' // optional. Defaults to 'sessions'
    });

    const session = expressSession({
        key: "trsession" + _camelCase(config.projectShortname + (process.env.PROJECT_SAMPLE ? "_" + process.env.PROJECT_SAMPLE : "")),
        secret: process.env.EXPRESS_SESSION_SECRET_KEY,
        resave: false,
        saveUninitialized: false,
        store: sessionStore
    });

    app.use(morgan('combined', {
        // do not log if nolog=true is part of the url params:
        skip: function (req, res) { return req.url.indexOf('nolog=true') !== -1; }
    }));
    app.use(express.json({ limit: '500mb' }));
    app.use(express.urlencoded({ limit: '500mb', extended: true }));
    app.use(session);
    app.use(requestIp.mw()); // to get users ip addresses
    app.use(favicon(path.join(publicDirectory, 'favicon.ico')));

    app.set('trust proxy',true); // allow nginx or other proxy server to send request ip address

    // send js and css compressed (gzip) to save bandwidth:
    app.get('*.js', function(req, res, next) {
        req.url = req.url + '.gz';
        res.set('Content-Encoding', 'gzip');
        res.set('Content-Type', 'text/javascript');
        next();
    });

    app.get('*.css', function(req, res, next) {
        req.url = req.url + '.gz';
        res.set('Content-Encoding', 'gzip');
        res.set('Content-Type', 'text/css');
        next();
    });

    app.use('/locales/', localePath); // this needs to be after gzip middlewares.

    app.use('/dist/', publicPath); // this needs to be after gzip middlewares.


    // TODO: move all routes to socket routes:
    authRoutes(app, userAuthModel);
    // TODO Let the survey project's server.js file do this
    try {
        if (typeof serverSetupFct === 'function') {
            serverSetupFct();
        }
    } catch(error) {
        console.log('Error running project specific server setup function: ', error);
    }
    require('./routes/survey/routes.js')(app);
    // Add the trRouting routes
    trRoutingRouter(app);
    // Set the roles for the survey app
    defineDefaultRoles();

    const adminRoutes = require('./routes/admin/admin.routes.js');
    app.use('/api/admin', adminRoutes);

    app.get('/incompatible', function (req, res) { res.sendFile(path.join(publicDirectory, 'incompatible.html')); });

    app.get('/ping', function(req, res) {
    return res.status(200).json({
        status: 'online'
    });
    });

    app.get('*', function (req, res) {
        res.sendFile(indexPath); 
    });

    return { app, session };
}

process.on('unhandledRejection', function(err){
    console.error(err.stack);
});

export default setupServerApp;
