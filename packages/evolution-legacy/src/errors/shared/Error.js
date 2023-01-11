/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// TODO Use the class from chaire-lib-common instead

class TrError extends Error {
  constructor(message, code, localizedError) {
    super(message)
    
    // see https://medium.com/@xjamundx/custom-javascript-errors-in-es6-aa891b173f87
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, TrError);
    }

    this.code             = code;
    this.localizedMessage = localizedError;
  }

  export() {
    return {
      flash           : this.localizedMessage, // deprecated
      localizedMessage: this.localizedMessage,
      error           : this.message,
      errorCode       : this.code
    };
  }

  toString() {
    return this.message + " (" + this.code + ")";
  }
}

module.exports = TrError;