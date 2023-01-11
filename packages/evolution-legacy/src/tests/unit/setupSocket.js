/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
require("@babel/register");
const ioClient                   = require('socket.io-client');
const http                       = require('http');

const { app, session }           = require('../../serverApp');
const createAuthenticatedRequest = require('./routes/shared/createAuthenticatedRequest');

import serviceLocator from 'chaire-lib-common/lib/utils/ServiceLocator';

export default function() {

  return new Promise(function(resolve, reject) {

    if (serviceLocator.hasService('socketEventManager'))
    {
      resolve(serviceLocator);
    }

    const server        = http.createServer(app);
    const serverAddress = server.listen().address();
    const io = require('../../socketServerApp')(server, session);
    serviceLocator.addService('httpServer', server);
    serviceLocator.addService('socketIo', io);

    createAuthenticatedRequest(app, function(cookie) {
      const socket = ioClient.connect(`http://[${serverAddress.address}]:${serverAddress.port}`, {
        'reconnection delay': 0,
        'reopen delay': 0,
        'force new connection': true,
        transports: ['websocket'],
        extraHeaders: {
          cookie: cookie
        }
      });
      socket.on('connect', () => {
        
      });
      serviceLocator.addService('socketEventManager', socket);
      resolve(serviceLocator);
      
    });
  });
  
}