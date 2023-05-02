/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Metadata } from '../interviews/Metadata';

/**
 * Type the generic response object, which is used to represent an object used to group
 * answers in commonly namespaced attributes. It always has a uuid and optional metadata.
 *
 * @export
 * @interface ResponseObject // abstract, used as parent only
 */
export type ResponseObject = {
    _uuid: string;
    _metadata?: Metadata;
};
