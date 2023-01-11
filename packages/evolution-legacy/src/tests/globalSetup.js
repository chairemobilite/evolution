/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
require("@babel/register");
import Dotenv  from 'dotenv';
Dotenv.config({ path: '../.env' });
//const ioClient                   = require('socket.io-client');
//const http                       = require('http');

//const { app, session }           = require('../serverApp');
//const createAuthenticatedRequest = require('./routes/shared/createAuthenticatedRequest');
//const serviceLocator             = require('chaire-lib-common/lib/utils/ServiceLocator').default;

module.exports = function() {

  return new Promise(function(resolve, reject) {

    const currentDb = process.env[`PG_DATABASE_${process.env.NODE_ENV.toUpperCase()}`];

    if (currentDb && (currentDb == process.env[`PG_DATABASE_DEVELOPMENT`] || currentDb == process.env[`PG_DATABASE_PRODUCTION`])) {
        // Using same DB as dev or prod, exit
        reject("the testing database is the same as production or development!!! All data in the database will be deleted after the test, please change the databases's name.");
        return;
    }

    //const server        = http.createServer(app);
    //const serverAddress = server.listen().address();
    //const io = require('../socketServerApp')(server, session);
    //serviceLocator.addService('httpServer', server);
    //serviceLocator.addService('socketIo', io);
    //
    //createAuthenticatedRequest(app, function(cookie) {
    //  const socket = ioClient.connect(`http://[${serverAddress.address}]:${serverAddress.port}`, {
    //    'reconnection delay': 0,
    //    'reopen delay': 0,
    //    'force new connection': true,
    //    transports: ['websocket'],
    //    extraHeaders: {
    //      cookie: cookie
    //    }
    //  });
    //  socket.on('connect', () => {
    //    
    //  });
    //  serviceLocator.addService('socketEventManager', socket);
    //  global.serviceLocator  = serviceLocator; // for teardown
    //  resolve();
    //});
    resolve();
  });
  
};