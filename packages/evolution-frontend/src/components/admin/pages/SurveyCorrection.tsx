/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { useContext } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { useParams } from 'react-router';

import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import {
    startSetSurveyCorrectedInterview,
    startUpdateSurveyCorrectedInterview,
    startSurveyCorrectedAddGroupedObjects,
    startSurveyCorrectedRemoveGroupedObjects,
    startNavigateCorrectedInterview
} from '../../../actions/SurveyAdmin';
import { withPreferencesHOC } from '../../hoc/WithPreferencesHoc';
import {
    StartAddGroupedObjects,
    StartNavigate,
    StartRemoveGroupedObjects,
    StartUpdateInterview
} from 'evolution-common/lib/services/questionnaire/types';
import { RootState } from '../../../store/configureStore';
import { SurveyAction } from '../../../store/survey';
import Survey from '../../pageParts/Survey';
import { useTranslation } from 'react-i18next';
import { SurveyContext } from '../../../contexts/SurveyContext';
import { initNavigationService } from '../../../actions/Survey';

const SurveyCorrection: React.FC = () => {
    const { t } = useTranslation(['admin', 'survey', 'main']);
    const interview = useSelector((state: RootState) => state.survey.interview);
    const interviewLoaded = useSelector((state: RootState) => state.survey.interviewLoaded);
    const dispatch = useDispatch<ThunkDispatch<RootState, unknown, SurveyAction>>();
    const { interviewUuid } = useParams();
    const { sections } = useContext(SurveyContext);

    // Use the redux actions for the corrected interview
    const startUpdateInterviewAction: StartUpdateInterview = React.useCallback(
        (data, callback) => dispatch(startUpdateSurveyCorrectedInterview(data, callback)),
        []
    );
    const startAddGroupedObjectsAction: StartAddGroupedObjects = React.useCallback(
        (newObjectsCount, insertSequence, path, attributes, callback, returnOnly) =>
            dispatch(
                startSurveyCorrectedAddGroupedObjects(
                    newObjectsCount,
                    insertSequence,
                    path,
                    attributes,
                    callback,
                    returnOnly
                )
            ),
        []
    );
    const startRemoveGroupedObjectsAction: StartRemoveGroupedObjects = React.useCallback(
        (paths, callback, returnOnly) =>
            dispatch(startSurveyCorrectedRemoveGroupedObjects(paths, callback, returnOnly)),
        []
    );
    const startNavigateAction: StartNavigate = React.useCallback(
        (section: Parameters<StartNavigate>[0]) => dispatch(startNavigateCorrectedInterview(section)),
        [dispatch]
    );

    if (interviewUuid === undefined) {
        return (
            <div className="survey" style={{ display: 'block' }} id="surveyErrorPage">
                <h2>{t(['survey:AnErrorOccurred', 'main:AnErrorOccurred'])}</h2>
                <p>{t('admin:MissingUuidSurvey')}</p>
            </div>
        );
    }
    // Initialize navigation service before setting the interview in the next useEffect
    React.useEffect(() => {
        dispatch(initNavigationService(sections));
    }, [sections, dispatch]);

    React.useEffect(() => {
        // Load the interview when first mounting the component
        dispatch(startSetSurveyCorrectedInterview(interviewUuid));
    }, [interviewUuid, dispatch]); // Reload the interview if the uuid changes

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

export default withPreferencesHOC(SurveyCorrection);
