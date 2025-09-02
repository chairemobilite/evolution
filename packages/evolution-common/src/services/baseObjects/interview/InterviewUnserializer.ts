import { Optional } from '../../../types/Optional.type';
import { Result, createErrors, createOk, hasErrors, isOk } from '../../../types/Result.type';
import { ParamsValidatorUtils } from '../../../utils/ParamsValidatorUtils';
import { Uuidable } from '../Uuidable';
import { Interview, InterviewAttributes, ExtendedInterviewAttributesWithComposedObjects } from './Interview';
import { Household, ExtendedHouseholdAttributes } from '../Household';
import { Person, ExtendedPersonAttributes } from '../Person';
import { Organization, ExtendedOrganizationAttributes } from '../Organization';
import { InterviewParadata, InterviewParadataAttributes } from './InterviewParadata';
import { yesNoDontKnowValues } from '../attributeTypes/GenericAttributes';
import { create as createInterviewParadata } from './InterviewParadataUnserializer';

export type ExtendedInterviewWithComposedAttributes = InterviewAttributes & {
    household?: Optional<ExtendedHouseholdAttributes>;
    person?: Optional<ExtendedPersonAttributes>;
    organization?: Optional<ExtendedOrganizationAttributes>;
    paradata?: Optional<InterviewParadataAttributes>;
};

/**
 * Validate the interview params coming from the frontend as json unvalidated response.
 * This method does not audit the content, it just make sure that the values are of
 * the correct type and that required data is present.
 * @param dirtyParams the json data
 * @param displayName the name of the object for error messages
 * @returns an array of errors if any, or an empty array if the params are valid
 */
export const validateParams = function (dirtyParams: { [key: string]: unknown }, displayName = 'Interview'): Error[] {
    const errors: Error[] = [];

    errors.push(...ParamsValidatorUtils.isRequired('params', dirtyParams, displayName));
    errors.push(...ParamsValidatorUtils.isObject('params', dirtyParams, displayName));

    errors.push(...Uuidable.validateParams(dirtyParams));

    errors.push(...ParamsValidatorUtils.isPositiveNumber('_id', dirtyParams._id, displayName));
    errors.push(...ParamsValidatorUtils.isPositiveNumber('_participant_id', dirtyParams._participant_id, displayName));

    errors.push(...ParamsValidatorUtils.isString('accessCode', dirtyParams.accessCode, displayName));
    errors.push(...ParamsValidatorUtils.isDateString('assignedDate', dirtyParams.assignedDate, displayName));
    errors.push(...ParamsValidatorUtils.isString('contactPhoneNumber', dirtyParams.contactPhoneNumber, displayName));
    errors.push(
        ...ParamsValidatorUtils.isString('helpContactPhoneNumber', dirtyParams.helpContactPhoneNumber, displayName)
    );
    // TODO: we should test for valid email format, but we first need to make sure the email validation is correct in the frontend
    errors.push(...ParamsValidatorUtils.isString('contactEmail', dirtyParams.contactEmail, displayName));
    errors.push(...ParamsValidatorUtils.isString('helpContactEmail', dirtyParams.helpContactEmail, displayName));
    errors.push(
        ...ParamsValidatorUtils.isBoolean(
            'acceptToBeContactedForHelp',
            dirtyParams.acceptToBeContactedForHelp,
            displayName
        )
    );
    errors.push(
        ...ParamsValidatorUtils.isBoolean(
            'wouldLikeToParticipateInOtherSurveys',
            dirtyParams.wouldLikeToParticipateInOtherSurveys,
            displayName
        )
    );
    errors.push(...ParamsValidatorUtils.isString('respondentComments', dirtyParams.respondentComments, displayName));
    errors.push(...ParamsValidatorUtils.isString('interviewerComments', dirtyParams.interviewerComments, displayName));
    errors.push(...ParamsValidatorUtils.isString('auditorComments', dirtyParams.auditorComments, displayName));

    errors.push(...ParamsValidatorUtils.isPositiveInteger('durationRange', dirtyParams.durationRange, displayName));
    errors.push(
        ...ParamsValidatorUtils.isPositiveInteger(
            'durationRespondentEstimationMin',
            dirtyParams.durationRespondentEstimationMin,
            displayName
        )
    );
    errors.push(...ParamsValidatorUtils.isPositiveInteger('interestRange', dirtyParams.interestRange, displayName));
    errors.push(...ParamsValidatorUtils.isPositiveInteger('difficultyRange', dirtyParams.difficultyRange, displayName));
    errors.push(...ParamsValidatorUtils.isPositiveInteger('burdenRange', dirtyParams.burdenRange, displayName));
    errors.push(
        ...ParamsValidatorUtils.isIn(
            'consideredToAbandonRange',
            dirtyParams.consideredToAbandonRange,
            displayName,
            yesNoDontKnowValues,
            'YesNoDontKnow'
        )
    );

    return errors;
};

/**
 * Create an interview from the params with composed objects (household, person, organization, paradata).
 * If any param is invalid, return a list of errors (including nested params for composed objects)
 * If no error, return the interview object with composed objects.
 * @param dirtyParams the json data
 * @returns an interview object if the params are valid, or a list of errors otherwise
 */
export const create = function (dirtyParams: { [key: string]: unknown }): Result<Interview> {
    const errors = validateParams(dirtyParams);
    if (dirtyParams.household) {
        const householdResult = Household.create(dirtyParams.household as { [key: string]: unknown });
        if (isOk(householdResult)) {
            dirtyParams.household = householdResult.result as Household;
        } else if (hasErrors(householdResult)) {
            errors.push(...householdResult.errors);
        }
    }
    if (dirtyParams.person) {
        const personResult = Person.create(dirtyParams.person as { [key: string]: unknown });
        if (isOk(personResult)) {
            dirtyParams.person = personResult.result as Person;
        } else if (hasErrors(personResult)) {
            errors.push(...personResult.errors);
        }
    }
    if (dirtyParams.organization) {
        const organizationResult = Organization.create(dirtyParams.organization as { [key: string]: unknown });
        if (isOk(organizationResult)) {
            dirtyParams.organization = organizationResult.result as Organization;
        } else if (hasErrors(organizationResult)) {
            errors.push(...organizationResult.errors);
        }
    }
    if (dirtyParams.paradata) {
        const paradataResult = createInterviewParadata(dirtyParams.paradata as { [key: string]: unknown });
        if (isOk(paradataResult)) {
            dirtyParams.paradata = paradataResult.result as InterviewParadata;
        } else if (hasErrors(paradataResult)) {
            errors.push(...paradataResult.errors);
        }
    }
    const interview =
        errors.length === 0 ? new Interview(dirtyParams as ExtendedInterviewAttributesWithComposedObjects) : undefined;
    if (errors.length > 0) {
        return createErrors(errors);
    }
    return createOk(interview as Interview);
};
