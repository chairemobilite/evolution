/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import MessageNotification from './MessageNotification';

class WarningNotification extends MessageNotification {
  
  constructor(options = {}) {

    super('warning', options);

  }

}

export default WarningNotification