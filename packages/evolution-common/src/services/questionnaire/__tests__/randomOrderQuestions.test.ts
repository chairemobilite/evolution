/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { UserInterviewAttributes } from '../types';
import {
    getRandomOrderedWidgets,
    randomOrderQuestionsResponsePath,
    RandomOrderQuestions
} from '../randomOrderQuestions';

/** Interview with only the fields used to order the widgets */
const interviewWithOrders = (storedOrders: RandomOrderQuestions | undefined | null): UserInterviewAttributes => ({
    id: 1,
    uuid: 'arbitrary uuid',
    participant_id: 1,
    is_completed: false,
    is_valid: true,
    validations: {},
    response: storedOrders === undefined ? {} : { [randomOrderQuestionsResponsePath]: storedOrders }
});

describe('getRandomOrderedWidgets', () => {
    const storedOrders = { attitudes: ['q3', 'q1', 'q2'] };

    test.each([
        ['group in config order', ['a', 'q1', 'q2', 'q3', 'b'], ['a', 'q3', 'q1', 'q2', 'b']],
        ['group in another order', ['a', 'q2', 'q3', 'q1', 'b'], ['a', 'q3', 'q1', 'q2', 'b']],
        ['group is the whole list', ['q1', 'q3', 'q2'], ['q3', 'q1', 'q2']]
    ])('applies the stored order when the %s', (_title, widgets, expected) => {
        expect(getRandomOrderedWidgets(interviewWithOrders(storedOrders), widgets)).toEqual(expected);
    });

    test.each([
        ['a widget of the group is missing', ['a', 'q1', 'q2', 'b'], storedOrders],
        ['a widget is inserted in the group', ['q1', 'x', 'q2', 'q3'], storedOrders],
        ['no widget of the group is there', ['a', 'b'], storedOrders],
        ['no order was stored for this group', ['q1', 'q2', 'q3'], { otherGroup: ['v1', 'v2'] }],
        ['no order was stored at all', ['q1', 'q2', 'q3'], undefined],
        ['the stored orders are null', ['q1', 'q2', 'q3'], null]
    ])('leaves the widgets unchanged when %s', (_title, widgets, orders) => {
        expect(getRandomOrderedWidgets(interviewWithOrders(orders), widgets)).toEqual(widgets);
    });

    test('applies every group of the list', () => {
        expect(
            getRandomOrderedWidgets(interviewWithOrders({ attitudes: ['q2', 'q1'], values: ['v2', 'v1'] }), [
                'q1',
                'q2',
                'mid',
                'v1',
                'v2'
            ])
        ).toEqual(['q2', 'q1', 'mid', 'v2', 'v1']);
    });

    test('applies the same stored orders to each list where the group is successive', () => {
        const interview = interviewWithOrders({ attitudes: ['q2', 'q1'] });
        expect(getRandomOrderedWidgets(interview, ['q1', 'q2', 'size'])).toEqual(['q2', 'q1', 'size']);
        expect(getRandomOrderedWidgets(interview, ['age', 'q1', 'q2'])).toEqual(['age', 'q2', 'q1']);
    });

    test('applies the first group only when 2 groups share a widget in the same list', () => {
        // Once `q1, q2` is reordered, `q2, q3` is not successive anymore
        expect(
            getRandomOrderedWidgets(interviewWithOrders({ first: ['q2', 'q1'], second: ['q3', 'q2'] }), [
                'q1',
                'q2',
                'q3'
            ])
        ).toEqual(['q2', 'q1', 'q3']);
    });
});
