/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { renderHook } from '@testing-library/react';
import { useSectionTemplate, SectionProps } from '../useSectionTemplate';
import { MemoryRouter } from 'react-router'

jest.mock('../../../services/url', () => ({
    getPathForSection: jest.fn(() => '/new-path')
}));

describe('useSectionTemplate', () => {
    let props: SectionProps;

    beforeEach(() => {
        props = {
            shortname: 'testSection',
            sectionConfig: {
                previousSection: null,
                nextSection: null,
                preload: jest.fn(),
                widgets: []
            },
            interview: { response: { field1: 'test' }} as any,
            errors: {},
            user: {} as any,
            startUpdateInterview: jest.fn(),
            startAddGroupedObjects: jest.fn(),
            startRemoveGroupedObjects: jest.fn(),
            startNavigate: jest.fn(),
            allWidgetsValid: true,
            submitted: false,
            loadingState: 0
        };
    });

    it('should call preload function on mount', () => {
        renderHook(() => useSectionTemplate(props), { wrapper: MemoryRouter });
        expect(props.sectionConfig.preload).toHaveBeenCalledWith(
            props.interview, {
                startUpdateInterview: props.startUpdateInterview,
                startAddGroupedObjects: props.startAddGroupedObjects,
                startRemoveGroupedObjects: props.startRemoveGroupedObjects,
                startNavigate: props.startNavigate,
                callback: expect.any(Function),
                user: props.user
            }
        );
    });

    it('should set preloaded to true if preload is not a function', () => {
        props.sectionConfig.preload = undefined;
        const { result } = renderHook(() => useSectionTemplate(props), { wrapper: MemoryRouter });
        expect(result.current.preloaded).toBe(true);
    });

    it('should focus on the first invalid input if form is submitted and not all widgets are valid', () => {
        document.body.innerHTML = `
            <div class="question-invalid">
                <input id="invalid-input" type="text" />
            </div>
        `;
        props.allWidgetsValid = false;
        props.submitted = true;
        renderHook(() => useSectionTemplate(props), { wrapper: MemoryRouter });
        const inputElement = document.getElementById('invalid-input');
        expect(document.activeElement).toBe(inputElement);
    });

    it('should scroll to the first invalid question if form is submitted and not all widgets are valid', () => {
        const gotoPosition = 1000;
        document.body.innerHTML = `
            <div class="question-invalid" style="margin-top: 1000px;">
                <input id="invalid-input" type="checkbox" />
            </div>
        `;
        const invalidElement = document.querySelector('.question-invalid');
        Object.defineProperty(invalidElement, 'offsetTop', { value: gotoPosition });
        window.scrollTo = jest.fn();
        props.allWidgetsValid = false;
        props.submitted = true;
        renderHook(() => useSectionTemplate(props), { wrapper: MemoryRouter });
        expect(window.scrollTo).toHaveBeenCalledWith(0, gotoPosition);
    });

});
