/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import Notification from './Notification';

class ProgressNotification extends Notification {
  
  constructor(actionShortname, actionLocalizedName) {

    super('progress');

    this._actionShortname     = actionShortname;
    this._actionLocalizedName = actionLocalizedName;
    this._progress            = 0.0;

  }
  
  set progress(progress) {
    this._progress = progress;
  }

  get progress() {
    return this._progress;
  }

  get actionShortname() {
    return this._actionShortname;
  }

  get actionLocalizedName() {
    return this._actionLocalizedName;
  }

  get percentage() {
    return Math.round(this.progress * 100);
  }

  get isComplete() {
    return this.progress === 1.0;
  }

}

export default ProgressNotification