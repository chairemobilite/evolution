/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render } from '@testing-library/react';

import { interviewAttributes } from './interviewData';
import InputSelectFeature from '../InputSelectFeature';
import i18next from 'i18next';

const userAttributes = {
    id: 1,
    username: 'foo',
    preferences: {  },
    serializedPermissions: [],
    isAuthorized: () => true,
    is_admin: false,
    pages: [],
    showUserInfo: true
};

const testFeatureCollection = {
    type: 'FeatureCollection' as const,
    features: [
        { type: 'Feature' as const, id: 'feature1', properties: { label: 'Label For Feature 1' }, geometry: { type: 'Point' as const, coordinates: [0,0] } },
        { type: 'Feature' as const, id: 'feature2', properties: { label: 'Label For Feature 2' }, geometry: { type: 'Point' as const, coordinates: [1,1] } },
        { type: 'Feature' as const, id: 'feature3', properties: { label: 'Label For Feature 3' }, geometry: { type: 'Point' as const, coordinates: [2,3] } },
        { type: 'Feature' as const, id: 'feature4', properties: { label: 'Label For Feature 4' }, geometry: { type: 'Point' as const, coordinates: [3,1] } }
    ]
};

test('Render InputSelect with normal option type, no sorting', () => {

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
    
    const { container } = render(
        <InputSelectFeature
            id={'test'}
            onValueChange={() => { /* nothing to do */}}
            widgetConfig={widgetConfig}
            value='value'
            inputRef={React.createRef()}
            interview={interviewAttributes}
            user={userAttributes}
            path='foo.test'
        />
    );
    expect(container).toMatchSnapshot();
    expect(refGeographyFct).toHaveBeenCalledWith(interviewAttributes, 'foo.test', userAttributes);
});

test('Render InputSelect with normal option type, proximity sorting', () => {

    // Return geography, sorting should be features 4, 2, 1, 3
    const refGeographyFct = jest.fn().mockReturnValue({ type: 'Feature' as const, geometry: { type: 'Point', coordinates: [2.5, 0] }, properties: {} });

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
    
    const { container } = render(
        <InputSelectFeature
            id={'test'}
            onValueChange={() => { /* nothing to do */}}
            widgetConfig={widgetConfig}
            value='value'
            inputRef={React.createRef()}
            interview={interviewAttributes}
            user={userAttributes}
            path='foo.test'
        />
    );
    expect(container).toMatchSnapshot();
    expect(refGeographyFct).toHaveBeenCalledWith(interviewAttributes, 'foo.test', userAttributes);
});
