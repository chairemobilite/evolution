/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
class Notification {
 
  constructor(notificationName) {
    this._notificationName = notificationName;
  }

  get name() {
    return this._notificationName;
  }

}

export default Notification