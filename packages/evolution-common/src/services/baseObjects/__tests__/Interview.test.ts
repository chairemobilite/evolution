/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Interview, InterviewAttributes, ExtendedInterviewAttributes, interviewAttributes } from '../Interview';
import { HouseholdAttributes } from '../Household';
import { PersonAttributes } from '../Person';
import { OrganizationAttributes } from '../Organization';
import { v4 as uuidV4 } from 'uuid';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';

describe('Interview', () => {
    const validAttributes: InterviewAttributes = {
        _uuid: uuidV4(),
        accessCode: 'ABC123',
        assignedDate: '2023-06-10',
        contactPhoneNumber: '1234567890',
        contactEmail: 'test@example.com',
        wouldLikeToParticipateInOtherSurveys: true,
        _startedAt: 123456789,
        _updatedAt: 234567890,
        _completedAt: 345678901,
        _language: 'en',
        _source: 'web',
        _isCompleted: true,
        _device: 'tablet',
        _isValid: true,
    };

    const extendedAttributes: ExtendedInterviewAttributes = {
        ...validAttributes,
        customAttribute: 'Custom Value',
        household: {
            _uuid: uuidV4(),
            size: 4,
            _isValid: true,
        },
        person: {
            _uuid: uuidV4(),
            age: 30,
            _isValid: true,
        },
        organization: {
            _uuid: uuidV4(),
            name: 'Sample Organization',
            _isValid: true,
        },
    };

    test('should create an Interview instance with valid attributes', () => {
        const interview = new Interview(validAttributes);
        expect(interview).toBeInstanceOf(Interview);
        expect(interview.attributes).toEqual(validAttributes);
    });

    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = Interview.validateParams.toString();
        interviewAttributes.filter((attribute) => attribute !== '_uuid').forEach((attributeName) => {
            expect(validateParamsCode).toContain('\'' + attributeName + '\'');
        });
    });

    test('should get uuid', () => {
        const interview = new Interview({ ...validAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' });
        expect(interview._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create an Interview instance with valid attributes', () => {
        const result = Interview.create(validAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Interview);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = Interview.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should create an Interview instance with extended attributes', () => {
        const result = Interview.create(extendedAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Interview);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validAttributes, _isCompleted: 'invalid' };
        const result = Interview.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize an Interview instance', () => {
        const interview = Interview.unserialize(validAttributes);
        expect(interview).toBeInstanceOf(Interview);
        expect(interview.attributes).toEqual(validAttributes);
    });

    test('should validate Interview attributes', () => {
        const errors = Interview.validateParams(validAttributes);
        expect(errors).toHaveLength(0);
    });

    test('should return errors for invalid Interview attributes', () => {
        const invalidAttributes = { ...validAttributes, accessCode: 123 };
        const errors = Interview.validateParams(invalidAttributes);
        expect(errors).toHaveLength(1);
    });

    test('should validate an Interview instance', () => {
        const interview = new Interview(validAttributes);
        expect(interview.validate()).toBe(true);
        expect(interview.isValid()).toBe(true);
    });

    test('should create an Interview instance with custom attributes', () => {
        const customAttributes = {
            customAttribute1: 'value1',
            customAttribute2: 'value2',
        };
        const interviewAttributes = {
            ...validAttributes,
            ...customAttributes,
        };
        const interview = new Interview(interviewAttributes);
        expect(interview).toBeInstanceOf(Interview);
        expect(interview.attributes).toEqual(validAttributes);
        expect(interview.customAttributes).toEqual(customAttributes);
    });

    describe('validateParams', () => {
        test.each([
            ['accessCode', 123],
            ['assignedDate', 123],
            ['contactPhoneNumber', 123],
            ['contactEmail', 123],
            ['wouldLikeToParticipateInOtherSurveys', 'invalid'],
            ['_startedAt', 'invalid'],
            ['_updatedAt', 'invalid'],
            ['_completedAt', 'invalid'],
            ['_language', 123],
            ['_source', 123],
            ['_isCompleted', 'invalid'],
            ['_device', 123],
        ])('should return an error for invalid %s', (param, value) => {
            const invalidAttributes = { ...validAttributes, [param]: value };
            const errors = Interview.validateParams(invalidAttributes);
            expect(errors[0].toString()).toContain(param);
            expect(errors).toHaveLength(1);
        });

        test('should return no errors for valid attributes', () => {
            const errors = Interview.validateParams(validAttributes);
            expect(errors).toHaveLength(0);
        });
    });

    describe('Getters and Setters', () => {
        test.each([
            ['accessCode', 'XYZ789'],
            ['assignedDate', '2023-06-11'],
            ['contactPhoneNumber', '9876543210'],
            ['contactEmail', 'updated@example.com'],
            ['wouldLikeToParticipateInOtherSurveys', true],
            ['_startedAt', 12345678],
            ['_updatedAt', 12345679],
            ['_completedAt', 12345670],
            ['_language', 'fr'],
            ['_source', 'phone'],
            ['_isCompleted', false],
            ['_device', 'tableet'],
        ])('should set and get %s', (attribute, value) => {
            const interview = new Interview(validAttributes);
            interview[attribute] = value;
            expect(interview[attribute]).toEqual(value);
        });

        describe('Getters for attributes with no setters', () => {
            test.each([
                ['_uuid', extendedAttributes._uuid],
                ['customAttributes', { customAttribute: extendedAttributes.customAttribute }],
                ['attributes', validAttributes],
            ])('should set and get %s', (attribute, value) => {
                const interview = new Interview(extendedAttributes);
                expect(interview[attribute]).toEqual(value);
            });
        });

        test.each([
            ['_isValid', false],
            ['household', extendedAttributes.household],
            ['person', extendedAttributes.person],
            ['organization', extendedAttributes.organization],
        ])('should set and get %s', (attribute, value) => {
            const interview = new Interview(validAttributes);
            interview[attribute] = value;
            expect(interview[attribute]).toEqual(value);
        });
    });

    describe('Composed Attributes', () => {
        test('should create a Household instance for household when creating an Interview instance', () => {
            const householdAttributes: HouseholdAttributes = {
                _uuid: uuidV4(),
                size: 3,
                _isValid: true,
            };

            const interviewAttributes: ExtendedInterviewAttributes = {
                ...validAttributes,
                household: householdAttributes,
            };

            const result = Interview.create(interviewAttributes);
            expect(isOk(result)).toBe(true);
            const interview = unwrap(result) as Interview;
            expect(interview.household).toBeDefined();
            expect(interview.household?.attributes).toEqual(householdAttributes);
        });

        test('should create a Person instance for person when creating an Interview instance', () => {
            const personAttributes: PersonAttributes = {
                _uuid: uuidV4(),
                age: 25,
                _isValid: true,
            };

            const interviewAttributes: ExtendedInterviewAttributes = {
                ...validAttributes,
                person: personAttributes,
            };

            const result = Interview.create(interviewAttributes);
            expect(isOk(result)).toBe(true);
            const interview = unwrap(result) as Interview;
            expect(interview.person).toBeDefined();
            expect(interview.person?.attributes).toEqual(personAttributes);
        });

        test('should create an Organization instance for organization when creating an Interview instance', () => {
            const organizationAttributes: OrganizationAttributes = {
                _uuid: uuidV4(),
                name: 'Another Organization',
                _isValid: true,
            };

            const interviewAttributes: ExtendedInterviewAttributes = {
                ...validAttributes,
                organization: organizationAttributes,
            };

            const result = Interview.create(interviewAttributes);
            expect(isOk(result)).toBe(true);
            const interview = unwrap(result) as Interview;
            expect(interview.organization).toBeDefined();
            expect(interview.organization?.attributes).toEqual(organizationAttributes);
        });
    });
});
