/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { _isBlank } from "chaire-lib-common/lib/utils/LodashExtensions";

const getIdFromIdWithGeometryType = function(idWithGeometryType) { // example: way/12345 -> 12345
  if (_isBlank(idWithGeometryType))
  {
    return null;
  }
  const match = idWithGeometryType.toString().match(/\d+/);
  return match !== null ? parseInt(match[0]) : null;
};

export {
  getIdFromIdWithGeometryType
};