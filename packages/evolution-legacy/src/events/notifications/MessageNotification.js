/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import Notification from './Notification';

class MessageNotification extends Notification {
  
  constructor(eventName, options = {}) {
    
    super(eventName);

    options = Object.assign({
      title    : "",
      message  : "",  // localized string
      timeOutMS: null // null means no timeout, in milliseconds
    }, options);

    this.title            = options.title;
    this.message          = options.message;
    this.localizedMessage = options.localizedMessage;
    this.timeOutMS        = options.timeOutMS;

  }

}

export default MessageNotification