import { Optional } from '../../../types/Optional.type';
import { Result, createErrors, createOk } from '../../../types/Result.type';
import { ParamsValidatorUtils } from '../../../utils/ParamsValidatorUtils';
import { Uuidable } from '../Uuidable';
import { InterviewAttributes } from '../../../services/questionnaire/types';
import { Interview, ExtendedInterviewAttributesWithComposedObjects } from './Interview';
import { InterviewParadata, InterviewParadataAttributes } from './InterviewParadata';
import { yesNoDontKnowValues } from '../attributeTypes/GenericAttributes';
import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';

export type ExtendedInterviewWithComposedAttributes = InterviewAttributes & {
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
export const validateParams = function (
    dirtyParams: { [key: string]: unknown },
    interviewAttributes: InterviewAttributes,
    displayName = 'Interview'
): Error[] {
    const errors: Error[] = [];

    errors.push(...ParamsValidatorUtils.isPositiveNumber('id', interviewAttributes.id, displayName));

    errors.push(...ParamsValidatorUtils.isRequired('params', dirtyParams, displayName));
    errors.push(...ParamsValidatorUtils.isObject('params', dirtyParams, displayName));

    errors.push(...Uuidable.validateParams(dirtyParams));

    errors.push(
        ...ParamsValidatorUtils.isPositiveNumber('participant_id', interviewAttributes.participant_id, displayName)
    );

    errors.push(...ParamsValidatorUtils.isBoolean('isValid', interviewAttributes.is_valid, displayName));
    errors.push(...ParamsValidatorUtils.isBoolean('isCompleted', interviewAttributes.is_completed, displayName));
    errors.push(...ParamsValidatorUtils.isBoolean('isQuestionable', interviewAttributes.is_questionable, displayName));
    errors.push(...ParamsValidatorUtils.isBoolean('isValidated', interviewAttributes.is_validated, displayName));

    errors.push(...ParamsValidatorUtils.isArrayOfStrings('languages', dirtyParams._languages, displayName));
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
            'consideredAbandoning',
            dirtyParams.consideredAbandoning,
            displayName,
            yesNoDontKnowValues,
            'YesNoDontKnow'
        )
    );

    const paradataAttributes = dirtyParams._paradata;
    if (paradataAttributes !== undefined) {
        errors.push(...InterviewParadata.validateParams(paradataAttributes as { [key: string]: unknown }, '_paradata'));
    }
    return errors;
};

/**
 * Create an interview from the params with composed objects (household, person, organization, paradata).
 * If any param is invalid, return a list of errors (including nested params for composed objects)
 * If no error, return the interview object with composed objects.
 * @param dirtyParams the json data
 * @param interviewAttributes the interview attributes
 * @returns an interview object if the params are valid, or a list of errors otherwise
 */
export const create = function (
    dirtyParams: { [key: string]: unknown },
    interviewAttributes: InterviewAttributes,
    surveyObjectsRegistry: SurveyObjectsRegistry
): Result<Interview> {
    const errors = validateParams(dirtyParams, interviewAttributes);
    const interview =
        errors.length === 0
            ? new Interview(
                  dirtyParams as ExtendedInterviewAttributesWithComposedObjects,
                  interviewAttributes,
                  surveyObjectsRegistry
            )
            : undefined;

    // Return errors if any validation errors occurred
    if (errors.length > 0) {
        return createErrors(errors);
    }

    return createOk(interview as Interview);
};
