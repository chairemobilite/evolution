/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { interviewAttributes } from './interviewData';
import InputSelectFeature from '../InputSelectFeature';
import i18next from 'i18next';

const userAttributes = {
    id: 1,
    username: 'foo',
    preferences: {},
    serializedPermissions: [],
    isAuthorized: () => true,
    is_admin: false,
    pages: [],
    showUserInfo: true
};

const testFeatureCollection = {
    type: 'FeatureCollection' as const,
    features: [
        {
            type: 'Feature' as const,
            id: 'feature1',
            properties: { label: 'Label For Feature 1' },
            geometry: { type: 'Point' as const, coordinates: [0, 0] }
        },
        {
            type: 'Feature' as const,
            id: 'feature2',
            properties: { label: 'Label For Feature 2' },
            geometry: { type: 'Point' as const, coordinates: [1, 1] }
        },
        {
            type: 'Feature' as const,
            id: 'feature3',
            properties: { label: 'Label For Feature 3' },
            geometry: { type: 'Point' as const, coordinates: [2, 3] }
        },
        {
            type: 'Feature' as const,
            id: 'feature4',
            properties: { label: 'Label For Feature 4' },
            geometry: { type: 'Point' as const, coordinates: [3, 1] }
        }
    ]
};

test('Render InputSelect with normal option type, no sorting', async () => {
    // Return null for ref geography, features should not be sorted
    const refGeographyFct = jest.fn().mockReturnValue(null);

    const widgetConfig = {
        type: 'question' as const,
        twoColumns: true,
        path: 'test.foo',
        inputType: 'selectFeature' as const,
        featureCollection: testFeatureCollection,
        labelProperty: 'label',
        referenceGeography: refGeographyFct,
        size: 'medium',
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    };

    const user = userEvent.setup();
    const { container } = render(
        <InputSelectFeature
            id={'test'}
            onValueChange={() => {
                /* nothing to do */
            }}
            widgetConfig={widgetConfig}
            value="value"
            inputRef={React.createRef()}
            interview={interviewAttributes}
            user={userAttributes}
            path="foo.test"
        />
    );
    // Open the menu so the options (in collection order) appear in the snapshot
    await user.click(screen.getByRole('combobox'));
    expect(container).toMatchSnapshot();
    expect(refGeographyFct).toHaveBeenCalledWith(interviewAttributes, 'foo.test', userAttributes);
});

const widgetConfigWithRef = (refGeographyFct) => ({
    type: 'question' as const,
    twoColumns: true,
    path: 'test.foo',
    inputType: 'selectFeature' as const,
    featureCollection: testFeatureCollection,
    labelProperty: 'label',
    referenceGeography: refGeographyFct,
    size: 'medium',
    containsHtml: true,
    label: { fr: `Texte en français`, en: `English text` }
});

describe('InputSelectFeature searchable behavior', () => {
    // Reference at [2.5, 0] so the proximity order is features 4, 2, 1, 3
    const refGeographyFct = () => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [2.5, 0] },
        properties: {}
    });

    test('shows all options in proximity order when opened', async () => {
        const user = userEvent.setup();
        render(
            <InputSelectFeature
                id={'test'}
                onValueChange={() => {
                    /* nothing to do */
                }}
                widgetConfig={widgetConfigWithRef(refGeographyFct)}
                interview={interviewAttributes}
                user={userAttributes}
                path="foo.test"
            />
        );

        await user.click(screen.getByRole('combobox'));

        const options = screen.getAllByText(/Label For Feature/).map((node) => node.textContent);
        expect(options).toEqual([
            'Label For Feature 4',
            'Label For Feature 2',
            'Label For Feature 1',
            'Label For Feature 3'
        ]);
    });

    test('filters options as the user types', async () => {
        const user = userEvent.setup();
        render(
            <InputSelectFeature
                id={'test'}
                onValueChange={() => {
                    /* nothing to do */
                }}
                widgetConfig={widgetConfigWithRef(refGeographyFct)}
                interview={interviewAttributes}
                user={userAttributes}
                path="foo.test"
            />
        );

        await user.type(screen.getByRole('combobox'), 'Feature 3');

        expect(screen.queryByText('Label For Feature 3')).not.toBeNull();
        expect(screen.queryByText('Label For Feature 1')).toBeNull();
        expect(screen.queryByText('Label For Feature 2')).toBeNull();
    });

    test('calls onValueChange with the selected feature id', async () => {
        const user = userEvent.setup();
        const onValueChange = jest.fn();
        render(
            <InputSelectFeature
                id={'test'}
                onValueChange={onValueChange}
                widgetConfig={widgetConfigWithRef(refGeographyFct)}
                interview={interviewAttributes}
                user={userAttributes}
                path="foo.test"
            />
        );

        await user.click(screen.getByRole('combobox'));
        await user.click(screen.getByText('Label For Feature 2'));

        expect(onValueChange).toHaveBeenCalledWith({ target: { value: 'feature2' } });
    });

    test('calls onValueChange with null when the selection is cleared', async () => {
        const user = userEvent.setup();
        const onValueChange = jest.fn();
        const { container } = render(
            <InputSelectFeature
                id={'test'}
                onValueChange={onValueChange}
                widgetConfig={widgetConfigWithRef(refGeographyFct)}
                value="feature2"
                interview={interviewAttributes}
                user={userAttributes}
                path="foo.test"
            />
        );

        // react-select renders a clear indicator (no role/label) when clearable and a value is set
        const clearIndicator = container.querySelector('.react-select__clear-indicator');
        expect(clearIndicator).not.toBeNull();
        await user.click(clearIndicator as Element);

        expect(onValueChange).toHaveBeenCalledWith({ target: { value: null } });
    });
});

test('Render InputSelect with normal option type, proximity sorting', async () => {
    // Return geography, sorting should be features 4, 2, 1, 3
    const refGeographyFct = jest
        .fn()
        .mockReturnValue({
            type: 'Feature' as const,
            geometry: { type: 'Point', coordinates: [2.5, 0] },
            properties: {}
        });

    const widgetConfig = {
        type: 'question' as const,
        twoColumns: true,
        path: 'test.foo',
        inputType: 'selectFeature' as const,
        featureCollection: testFeatureCollection,
        labelProperty: 'label',
        referenceGeography: refGeographyFct,
        size: 'medium',
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    };

    const user = userEvent.setup();
    const { container } = render(
        <InputSelectFeature
            id={'test'}
            onValueChange={() => {
                /* nothing to do */
            }}
            widgetConfig={widgetConfig}
            value="value"
            inputRef={React.createRef()}
            interview={interviewAttributes}
            user={userAttributes}
            path="foo.test"
        />
    );
    // Open the menu so the proximity-sorted options (features 4, 2, 1, 3) appear in the snapshot
    await user.click(screen.getByRole('combobox'));
    expect(container).toMatchSnapshot();
    expect(refGeographyFct).toHaveBeenCalledWith(interviewAttributes, 'foo.test', userAttributes);
});
