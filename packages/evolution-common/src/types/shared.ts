/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Type for prefilled data imported from external sources.
 * This flexible JSON object format stores survey-specific imported data.
 * TODO: we may type this in the future and delegate the survey project to provide
 * mappings between imported csv data and preData objects.
 */
export type PreData = Record<string, unknown>;
