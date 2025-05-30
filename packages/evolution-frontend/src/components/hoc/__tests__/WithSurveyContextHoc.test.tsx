/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render } from '@testing-library/react';

import { withSurveyContext, WithSurveyContextProps } from '../WithSurveyContextHoc';
import { SurveyContext, surveyReducer } from '../../../contexts/SurveyContext';

interface TestProps {
    foo: string;
}

const testSections = {
    key1: {
        type: 'section' as const,
        previousSection: null,
        nextSection: null,
        widgets: ['a'],
        enableConditional: true,
        completionConditional: true,
        navMenu: { type: 'inNav' as const, menuName: 'key1' }
    },
    key2: {
        type: 'section' as const,
        previousSection: null,
        nextSection: null,
        widgets: [],
        enableConditional: true,
        completionConditional: true,
        navMenu: { type: 'inNav' as const, menuName: 'key2' }
    }
};

export const BaseTestComponent: React.FunctionComponent<{}> = (props: {}) => {
    const [devMode, dispatchSurvey] = React.useReducer(surveyReducer, { devMode: false });
    return (
        <SurveyContext.Provider value={{ sections: testSections, widgets: {}, ...devMode, dispatch: dispatchSurvey }}>
            <TestComponentWithContext foo='This is a test component'/>
        </SurveyContext.Provider>
    );
};
  
class TestComponent extends React.Component<TestProps & WithSurveyContextProps> {
    public render() {
        return <div>{Object.keys(this.props.surveyContext.sections)} {this.props.surveyContext.devMode === false ? 'normal' : 'dev' } {this.props.foo}</div>
    }
}

const TestComponentWithContext = withSurveyContext(TestComponent);

test('Test HOC', () => {
    const { container } = render(
        <BaseTestComponent/>
    );
    expect(container).toMatchSnapshot();
})