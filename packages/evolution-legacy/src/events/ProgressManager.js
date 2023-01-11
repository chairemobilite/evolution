/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import stubEventManager from './StubEventManager';

class ProgressManager {
  
  constructor(eventManager, progressName) {

    this._progressName = progressName;
    this._eventManager = eventManager ? eventManager : stubEventManager;

  }

  progress(progressEventName, completeRatio) { // float between 0.0 and 1.0
    //console.log(`progress ${this._progressName}${progressEventName}: ${completeRatio}`);
    this._eventManager.emit('progress', { name: `${this._progressName}${progressEventName}`, progress: completeRatio });
  }

}

export default ProgressManager
