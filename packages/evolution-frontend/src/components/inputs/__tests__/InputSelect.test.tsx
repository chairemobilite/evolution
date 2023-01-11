/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';

import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import InputSelect from '../InputSelect';

const userAttributes = {
    id: 1,
    username: 'foo',
    preferences: {  },
    serializedPermissions: [],
    isAuthorized: () => true,
    is_admin: false,
    pages: [],
    showUserInfo: true
}

const interviewAttributes: UserInterviewAttributes = {
    id: 1,
    uuid: 'arbitrary uuid',
    user_id: 1,
    is_completed: false,
    responses: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        section2: {
            q1: 'test'
        }
    },
    validations: {
        section1: {
            q1: true,
            q2: false
        },
        section2: {
            q1: true
        }
    },
    is_valid: true
};

test('Render InputSelect with normal option type', () => {

    const conditionalFct = jest.fn().mockReturnValue(true);
    const choices = [
        {
            value: 'val1',
            label: { en: 'english value', fr: 'valeur française' },
            hidden: false,
            icon: 'creative-commons' as const
        },
        {
            value: 'val2',
            label: 'Unilingual label',
            iconPath: 'img/test.png'
        },
        {
            value: 'hiddenVal',
            label: { en: 'english hidden', fr: 'cachée' },
            hidden: true
        },
        {
            value: 'conditionalVal',
            label: { en: 'english conditional', fr: 'conditionnelle' },
            conditional: conditionalFct
        }
    ];

    const widgetConfig = {
        type: 'question' as const,
        twoColumns: true,
        path: 'test.foo',
        inputType: 'select' as const,
        choices,
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    };
    
    const wrapper = TestRenderer.create(
        <InputSelect
            id={'test'}
            onValueChange={() => { /* nothing to do */}}
            widgetConfig={widgetConfig}
            value='value'
            inputRef={React.createRef()}
            size='medium'
            interview={interviewAttributes}
            user={userAttributes}
            path='foo.test'
        />
    );
    expect(wrapper).toMatchSnapshot();
    expect(conditionalFct).toHaveBeenCalledTimes(1);
    expect(conditionalFct).toHaveBeenCalledWith(interviewAttributes, 'foo.test', userAttributes);
    
});

test('Render InputSelect with choice function and grouped choice type', () => {

    const choices = [
        {
            value: 'val1',
            label: { en: 'english value', fr: 'valeur française' },
            hidden: false,
            icon: 'creative-commons' as const
        },
        {
            groupName: 'select group',
            groupShortname: 'sel',
            groupLabel: { en: 'english select label', fr: 'étiquette française' },
            choices: [
                {
                    value: 'val2',
                    label: 'Unilingual label',
                    iconPath: 'img/test.png'
                },
                {
                    value: 'hiddenVal',
                    label: { en: 'english hidden', fr: 'cachée' },
                    hidden: true
                },
            ]
        },
        {
            groupName: 'select group',
            groupShortname: 'sel',
            groupLabel: 'Unilingual group label',
            choices: [
                {
                    value: 'val2',
                    label: 'Unilingual label',
                    iconPath: 'img/test.png'
                },
                {
                    value: 'val3',
                    label: { en: 'english val3', fr: 'val3 français' }
                },
            ]
        }
    ];
    const choiceFct = jest.fn().mockReturnValue(choices);
    
    const widgetConfig = {
        type: 'question' as const,
        twoColumns: true,
        path: 'test.foo',
        inputType: 'select' as const,
        choices: choiceFct,
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    };
    
    const wrapper = TestRenderer.create(
        <InputSelect
            id={'test'}
            onValueChange={() => { /* nothing to do */}}
            widgetConfig={widgetConfig}
            value='value'
            inputRef={React.createRef()}
            size='medium'
            interview={interviewAttributes}
            user={userAttributes}
            path='foo.test'
        />
    );
    expect(wrapper).toMatchSnapshot();
    expect(choiceFct).toHaveBeenCalledTimes(1);
    expect(choiceFct).toHaveBeenCalledWith(interviewAttributes, 'foo.test', userAttributes);
    
});
