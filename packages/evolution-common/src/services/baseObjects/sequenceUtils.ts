/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Read-only helpers to sort and validate the `_sequence` of nested survey objects.
 *
 * In questionnaire responses, child objects (persons, journeys, visited places, trips,
 * segments) live in UUID-keyed hash maps. `_sequence` orders those maps; the UUID is
 * the identity. `addGroupedObjects` / `removeGroupedObjects` maintain `_sequence` when
 * a respondent adds or deletes an object, so a well-behaved survey always yields a
 * contiguous 1..n range.
 *
 * Nothing here mutates `_sequence`: a broken sequence is survey data we cannot silently
 * repair, because renumbering would hide the underlying questionnaire bug. Audit checks
 * report it instead, so a reviewer can look at the interview and decide.
 */

export type SequencedAttributes = {
    _sequence?: number;
};

export type SequencedSurveyObject = {
    attributes: SequencedAttributes;
};

/**
 * @param sequence - Raw `_sequence` value from survey data
 * @returns `true` when the value is a positive integer
 */
const isValidSequence = (sequence: unknown): sequence is number => {
    return typeof sequence === 'number' && Number.isInteger(sequence) && sequence > 0;
};

/**
 * Sort hash map entries by `_sequence` (`|| 0`), then UUID for a stable tie-break.
 * The order may be arbitrary when sequences are missing or duplicated, but that is ok:
 * the audit checks report those cases so a reviewer can fix the data.
 * @param uuidA - Object key from `Object.entries`
 * @param a - First entry attributes
 * @param uuidB - Object key from `Object.entries`
 * @param b - Second entry attributes
 */
export const compareSequenceThenUuid = <T extends SequencedAttributes>(
    [uuidA, a]: [string, T],
    [uuidB, b]: [string, T]
): number => {
    const sequenceDiff = (a._sequence || 0) - (b._sequence || 0);
    return sequenceDiff !== 0 ? sequenceDiff : uuidA.localeCompare(uuidB);
};

/**
 * Detect sequences we cannot order reliably: a missing or non-positive-integer
 * `_sequence`, or the same value used by more than one sibling. Audited as an error,
 * since the objects cannot be put in a defined order.
 *
 * @param items - Sibling child objects, as built by the survey object factories
 * @returns `true` when at least one `_sequence` is invalid or shared with a sibling
 */
export const hasInvalidOrDuplicateSequences = (items: SequencedSurveyObject[] | undefined): boolean => {
    if (!items || items.length === 0) {
        return false;
    }

    const seenSequences = new Set<number>();
    for (const item of items) {
        const sequence = item.attributes._sequence;
        if (!isValidSequence(sequence) || seenSequences.has(sequence)) {
            return true;
        }
        seenSequences.add(sequence);
    }
    return false;
};
