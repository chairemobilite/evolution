/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router';

import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import {
    startSetInterview,
    startUpdateInterview,
    startAddGroupedObjects,
    startRemoveGroupedObjects,
    initNavigationService,
    startNavigate
} from '../../actions/Survey';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import { withPreferencesHOC } from '../hoc/WithPreferencesHoc';
import { InterviewContext } from '../../contexts/InterviewContext';
import {
    StartAddGroupedObjects,
    StartNavigate,
    StartRemoveGroupedObjects,
    StartUpdateInterview
} from 'evolution-common/lib/services/questionnaire/types';
import { RootState } from '../../store/configureStore';
import { ThunkDispatch } from 'redux-thunk';
import { SurveyAction } from '../../store/survey';
import Survey from '../pageParts/Survey';
import { SurveyContext } from '../../contexts/SurveyContext';

type StartSetInterview = (
    activeSection: string | undefined,
    surveyUuid: string | undefined,
    preFilledResponse: { [key: string]: unknown } | undefined
) => void;

const SurveyParticipant: React.FC = () => {
    // Get state selectors and other hooks
    const interview = useSelector((state: RootState) => state.survey.interview);
    const interviewLoaded = useSelector((state: RootState) => state.survey.interviewLoaded);
    const dispatch = useDispatch<ThunkDispatch<RootState, unknown, SurveyAction>>();
    const navigate = useNavigate();
    const { sectionShortname: pathSectionShortname, uuid: surveyUuid } = useParams();
    const { sections } = useContext(SurveyContext);

    const { state: interviewContext } = React.useContext(InterviewContext);

    const startUpdateInterviewAction: StartUpdateInterview = React.useCallback(
        (data, callback) => dispatch(startUpdateInterview({ ...data, gotoFunction: navigate }, callback)),
        [navigate]
    );
    const startAddGroupedObjectsAction: StartAddGroupedObjects = React.useCallback(
        (newObjectsCount, insertSequence, path, attributes, callback, returnOnly) =>
            dispatch(startAddGroupedObjects(newObjectsCount, insertSequence, path, attributes, callback, returnOnly)),
        []
    );
    const startRemoveGroupedObjectsAction: StartRemoveGroupedObjects = React.useCallback(
        (paths, callback, returnOnly) => dispatch(startRemoveGroupedObjects(paths, callback, returnOnly)),
        []
    );
    const startNavigateAction: StartNavigate = React.useCallback(
        (section: Parameters<StartNavigate>[0]) => dispatch(startNavigate(section)),
        [dispatch]
    );

    // Initialize navigation service before setting the interview in the next useEffect
    React.useEffect(() => {
        dispatch(initNavigationService(sections));
    }, [sections, dispatch]);

    React.useEffect(() => {
        const startSetInterviewAction: StartSetInterview = (sectionShortname, surveyUuid, preFilledResponse) =>
            dispatch(startSetInterview(sectionShortname, surveyUuid, navigate, preFilledResponse));

        startSetInterviewAction(
            pathSectionShortname,
            surveyUuid,
            interviewContext &&
                interviewContext.status === 'entering' &&
                Object.keys(interviewContext.response).length > 0
                ? interviewContext.response
                : undefined
        );
    }, [surveyUuid, dispatch]); // Re-run when survey uuid changes

    // FIXME See if we can use react Suspense instead of this logic for the loading page (https://react.dev/reference/react/Suspense)
    if (!interviewLoaded || !interview || !interview.sectionLoaded) {
        surveyHelperNew.devLog('%c rendering empty survey', 'background: rgba(0,0,0,0.1);');
        return <LoadingPage />;
    }

    return (
        <Survey
            startUpdateInterview={startUpdateInterviewAction}
            startAddGroupedObjects={startAddGroupedObjectsAction}
            startRemoveGroupedObjects={startRemoveGroupedObjectsAction}
            startNavigate={startNavigateAction}
            interview={interview}
        />
    );
};

export default withPreferencesHOC(SurveyParticipant);
