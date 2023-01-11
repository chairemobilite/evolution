/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import MessageNotification from './MessageNotification';

class ErrorNotification extends MessageNotification {
  
  constructor(error, options = {}) { // error is a TrError instance

    super('error', options);

    this.message          = error.message;
    this.localizedMessage = error.localizedMessage;
    this.errorCode        = error.code;
    
  }

}

export default ErrorNotification