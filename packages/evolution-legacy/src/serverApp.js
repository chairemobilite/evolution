/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
const config           = require('chaire-lib-backend/lib/config/server.config').default;
import passport from 'chaire-lib-backend/lib/config/auth';
// TODO This is evolution specific
import defineDefaultRoles from 'evolution-backend/lib/services/auth/roleDefinition';
const knex             = require('chaire-lib-backend/lib/config/shared/db.config').default;
const path             = require('path');
const _camelCase        = require('lodash.camelcase');
const express          = require('express');
const favicon          = require('serve-favicon');
const bodyParser       = require('body-parser');
const expressSession   = require('express-session');
const KnexSessionStore = require('connect-session-knex')(expressSession);
const morgan           = require('morgan') // http logger
const bowser           = require('bowser');
const fs               = require('fs');
const { spawn }        = require('child_process');
import trRoutingRouter from 'chaire-lib-backend/lib/api/trRouting.routes';

//const WebSocket        = require('ws');
const requestIp        = require('request-ip');
const app              = express();

import { directoryManager } from 'chaire-lib-backend/lib/utils/filesystem/directoryManager';
import authRoutes from 'chaire-lib-backend/lib/api/auth.routes';
// TODO As routes migrate to typescript, these won't be required
import legacyAuthRoutes from './routes/shared/auth.routes';

directoryManager.createDirectoryIfNotExistsAbsolute(path.join(__dirname, '..', '..', '..', 'public', 'dist', config.projectShortname));
directoryManager.createDirectoryIfNotExists('logs');
directoryManager.createDirectoryIfNotExists('imports');
directoryManager.createDirectoryIfNotExists('cache');
directoryManager.createDirectoryIfNotExists('gtfs');
directoryManager.createDirectoryIfNotExists('exports');
directoryManager.createDirectoryIfNotExists('parsers');
directoryManager.createDirectoryIfNotExists('tasks');
directoryManager.createDirectoryIfNotExists('osrm');
directoryManager.createDirectoryIfNotExists('valhalla');

const indexPath        = path.join(__dirname, '..', '..', '..', 'public', 'dist', config.projectShortname, `index-${process.env.APP_NAME}-${config.projectShortname}${process.env.NODE_ENV === 'test' ? '_test' : ''}.html`);
const publicPath       = express.static(path.join(__dirname, '..', '..', '..', 'public', 'dist', config.projectShortname));
const localePath       = express.static(path.join(__dirname, '..', '..', '..', 'locales'));

process.on('unhandledRejection', function(err){
  console.error(err.stack);
});

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
app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));
app.use(session);
app.use(passport.initialize());
app.use(passport.session());
app.use(requestIp.mw()); // to get users ip addresses
app.use(favicon(path.join(__dirname, '..', '..', '..', 'public', 'favicon.ico')));

app.set('trust proxy',true); // allow nginx or other proxy server to send request ip address

// disable cache:
//app.use(function (req, res, next) {
//  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
//  res.header('Expires', '-1');
//  res.header('Pragma', 'no-cache');
//  next();
//});



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

// not sure what this does:
app.use('/locales/', localePath); // this needs to be after gzip middlewares.


app.use('/dist/', publicPath); // this needs to be after gzip middlewares.


// TODO: move all routes to socket routes:
authRoutes(app);
legacyAuthRoutes(app);
if (process.env.APP_NAME === 'survey')
{
  // TODO Let the survey project's server.js file do this
  try {
    require(`./../../../example/${config.projectShortname}/src/server.config.js`);
  } catch(error) {
    console.log('No project specific server side configuration. To specify configuration, add a `server.config.js` file in the project\'s `src/` directory', error);
  }
  require('./routes/survey/routes.js')(app);
  // Add the trRouting routes
  trRoutingRouter(app);
  // Set the roles for the survey app
  defineDefaultRoles();
}
const adminRoutes = require('./routes/admin/admin.routes.js');
app.use('/api/admin', adminRoutes);

app.get('/incompatible', function (req, res) { res.sendFile(path.join(__dirname, '..', 'public', 'incompatible.html')); });

// TODO move to transition (out of common):
// TODO 2: This should not be hard-coded here anyway!
app.get('/exports/batchRoutingResults.csv', function (req, res) { res.sendFile(path.join(__dirname, '..', 'projects', config.projectShortname, 'exports/batchRoutingResults.csv')); });
app.get('/exports/batchRoutingDetailedResults.csv', function (req, res) { res.sendFile(path.join(__dirname, '..', 'projects', config.projectShortname, 'exports/batchRoutingDetailedResults.csv')); });
app.get('/exports/batchRoutingGeometryResults.geojson', function (req, res) { res.sendFile(path.join(__dirname, '..', 'projects', config.projectShortname, 'exports/batchRoutingGeometryResults.geojson')); });
app.get('/exports/gtfs.zip', function (req, res) { res.sendFile(path.join(__dirname, '..', 'projects', config.projectShortname, 'exports/gtfs.zip')); });



app.get('/ping', function(req, res) {
  return res.status(200).json({
    status: 'online'
  });
});

app.get('*', function (req, res) {
  /*const browser        = bowser.getParser(req.headers['user-agent']);
  const isValidBrowser = browser.satisfies({
    mobile: {
      safari: ">10",
      chrome: ">45",
    },
    // or in general
    safari: ">10",
    chrome: ">45",
    firefox: ">34",
    opera: ">32",
    chromium: ">45",
    "internet explorer": ">12",
    "microsoft edge": ">15"
  });

  if (isValidBrowser)
  {*/
    res.sendFile(indexPath); 
  /*}
  else
  {
    console.log('incompatible browser');
    res.redirect('/incompatible');
  }*/

});

module.exports = { app, session };

//const wss    = new WebSocket.Server({
//  verifyClient: (info, done) => {
//    console.log('Parsing session from WebSocket request...');
//    session(info.req, {}, () => {
//      console.log('Session is parsed in WebSocket');
//      if(info.req.session && info.req.session.passport && info.req.session.passport.user > 0)
//      {
//        console.log("Authorized");
//        done(info.req.session.passport.user);
//      }
//      else
//      {
//        console.log("Unauthorized");
//        // This should close the connection, but doesn'T seem to close it correctly...
//        return done(false, 401, 'Unauthorized');
//      }
//      
//    });
//  },
//  server
//});
//
//wss.on('connection', (ws, req) => {
//  ws.on('message', (message) => {
//
//    if(req.session && req.session.passport && req.session.passport.user > 0)
//    {
//      console.log(`WS message ${message} from user ${req.session.passport.user}`);
//    }
//    else
//    {
//      console.log('Unauthorized');
//    }
//
//  });
//});