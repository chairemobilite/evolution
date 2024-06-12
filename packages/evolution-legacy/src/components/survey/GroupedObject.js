/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React               from 'react';
import { withTranslation } from 'react-i18next';
import Markdown            from 'react-markdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt }      from '@fortawesome/free-solid-svg-icons/faTrashAlt';
import _get                from 'lodash/get';

import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';
import { withSurveyContext } from 'evolution-frontend/lib/components/hoc/WithSurveyContextHoc';
import ConfirmModal     from 'chaire-lib-frontend/lib/components/modal/ConfirmModal';
import Text             from 'evolution-frontend/lib/components/survey/Text';
import InfoMap          from './InfoMap';
import InfoMapDirection from './InfoMapDirection';
import Button           from 'evolution-frontend/lib/components/survey/Button';
import Question         from 'evolution-frontend/lib/components/survey/Question';
import Group            from './Group';

export class GroupedObject extends React.Component {
  constructor(props) {
    super(props);
    
    this.beforeRemoveGroupedObject = this.beforeRemoveGroupedObject.bind(this);
    this.onRemoveGroupedObject     = this.onRemoveGroupedObject.bind(this);
  }

  beforeRemoveGroupedObject(e)
  {
    if (e)
    {
      e.preventDefault();
    }
    const widgetConfig            = this.props.surveyContext.widgets[this.props.shortname];
    const hasConfirmPopup         = widgetConfig.deleteConfirmPopup;
    const confirmPopupConditional = hasConfirmPopup ? surveyHelperNew.parseBoolean(widgetConfig.deleteConfirmPopup.conditional, this.props.interview, this.props.path, this.props.user) : true;

    if (hasConfirmPopup && confirmPopupConditional === true)
    {
      this.props.openConfirmModal(`_confirmDeleteButtonForGroupedObject__${this.props.path}`);
    }
    else
    {
      this.onRemoveGroupedObject();
    }
  }

  onRemoveGroupedObject(e)
  {
    if (e)
    {
      e.preventDefault();
    }
    this.props.startRemoveGroupedObjects(this.props.path);
  }

  render() {
    const groupedObjectShortname = this.props.surveyContext.widgets[this.props.shortname].shortname;
    surveyHelperNew.devLog('%c rendering ' + groupedObjectShortname + ' ' + this.props.objectId, 'background: rgba(0,255,0,0.1); font-size: 7px;');
    const path                   = this.props.path;
    const id                     = `survey-group-object__${path}`;
    const widgetConfig           = this.props.surveyContext.widgets[this.props.shortname];
    const groupedObjectId        = this.props.objectId;
    const parentObjectIds        = this.props.parentObjectIds;
    const sectionShortname       = this.props.section;
    parentObjectIds[groupedObjectShortname] = groupedObjectId;
    const widgetsComponents      = this.props.groupConfig.widgets.map((widgetShortname) => {
      const widgetPath   = `${path}.${widgetShortname}`;
      const widgetConfig = this.props.surveyContext.widgets[widgetShortname];
      const customPath   = widgetConfig.customPath ? `${path}.${widgetConfig.customPath}` : null;
      const widgetStatus = _get(this.props.interview, `groups.${this.props.shortname}.${groupedObjectId}.${widgetShortname}`, {});
      const [isServerValid, serverErrorMessage] = this.props.errors && this.props.errors[widgetPath] ? [false, this.props.errors[widgetPath]]: [true, undefined];
      // Overwrite widget status with server validation data if invalid
      if (!isServerValid) {
        widgetStatus.isValid = false;
        widgetStatus.errorMessage = widgetStatus.errorMessage || serverErrorMessage;
      }

      const defaultProps = {
        path                       : widgetPath,
        customPath                 : customPath,
        key                        : widgetPath,
        shortname                  : widgetShortname,
        loadingState               : this.props.loadingState,
        widgetConfig               : widgetConfig,
        widgetStatus               : widgetStatus,
        section                    : sectionShortname,
        groupShortname             : this.props.shortname,
        groupedObjectId            : groupedObjectId,
        interview                  : this.props.interview,
        user                       : this.props.user,
        openQuestionModal          : this.props.openQuestionModal,
        closeQuestionModal         : this.props.closeQuestionModal,
        openConfirmModal           : this.props.openConfirmModal,
        closeConfirmModal          : this.props.closeConfirmModal,
        confirmModalOpenedShortname: this.props.confirmModalOpenedShortname,
        isInsideModal              : this.props.isInsideModal,
        questionModalPath          : this.props.questionModalPath,
        startUpdateInterview       : this.props.startUpdateInterview,
        startAddGroupedObjects     : this.props.startAddGroupedObjects,
        startRemoveGroupedObjects  : this.props.startRemoveGroupedObjects
      };
      
      if (typeof widgetConfig.type === 'function') // custom widget component
      {
        const WidgetComponent = widgetConfig.type();
        return <WidgetComponent {...defaultProps}
          groupConfig                     = {this.props.groupsConfig[widgetShortname]}
          groupsConfig                    = {this.props.groupsConfig}
          parentObjectIds                 = {parentObjectIds}
        />;
      }

      switch(widgetConfig.type)
      {
        case 'text':              return <Text              {...defaultProps} />;
        case 'infoMap':           return <InfoMap           {...defaultProps} />;
        case 'infoMapDirection':  return <InfoMapDirection  {...defaultProps} />;
        case 'button':            return <Button            {...defaultProps}
          saveCallback    = {this.props.saveCallback}
        />;
        case 'question': return <Question {...defaultProps}
          path = {`${path}.${widgetConfig.path}`}
        />;
        case 'group':    return <Group    {...defaultProps}
          groupConfig     = {this.props.groupsConfig[widgetShortname]}
          groupsConfig    = {this.props.groupsConfig}
          parentObjectIds = {parentObjectIds}
        />;
      }
    }, this);

    let title = "";
    const localizedName = this.props.surveyContext.widgets[this.props.shortname].name[this.props.i18n.language];
    if (typeof localizedName === 'function')
    {
      title = localizedName(_get(this.props.interview.responses, path), this.props.sequence, this.props.interview, path);
    }
    else
    {
      title = localizedName;
    }

    const showDeleteButton  = surveyHelperNew.parseBoolean(this.props.groupConfig.showGroupedObjectDeleteButton, this.props.interview, this.props.path, this.props.user, false);
    const deleteButtonLabel = surveyHelperNew.parseString(this.props.groupConfig.groupedObjectDeleteButtonLabel ? (this.props.groupConfig.groupedObjectDeleteButtonLabel[this.props.i18n.language] || this.props.groupConfig.groupedObjectDeleteButtonLabel ): null, this.props.interview, this.props.path) || this.props.t(`survey:${widgetConfig.shortname}:deleteThisGroupedObject`);

    return (
      <div className="survey-group-object">
        <div className="content-container">
          <div className="survey-group-object__content">
            <h3 className="survey-group-object__title">
              <Markdown 
                disallowedTypes ={['paragraph']}
                unwrapDisallowed
                source     = {title}
                escapeHtml = {false}
                renderers  = {{paragraph: 'span'}}
              />
            </h3>
            <div className="center">
              {showDeleteButton && <button
                type      = "button"
                className = "button red small"
                onClick   = {this.beforeRemoveGroupedObject}
              >
                <FontAwesomeIcon icon={faTrashAlt} className="faIconLeft" />
                {deleteButtonLabel}
              </button>}
              { /* confirmPopup below: */ }
              {    this.props.confirmModalOpenedShortname === `_confirmDeleteButtonForGroupedObject__${this.props.path}`
                && widgetConfig.deleteConfirmPopup
                && widgetConfig.deleteConfirmPopup.content
                && widgetConfig.deleteConfirmPopup.content[this.props.i18n.language]
                && (<div>
                    <ConfirmModal 
                      isOpen        = {true}
                      closeModal    = {this.props.closeConfirmModal}
                      text          = {surveyHelperNew.parseString(widgetConfig.deleteConfirmPopup.content[this.props.i18n.language] || widgetConfig.deleteConfirmPopup.content, this.props.interview, this.props.path)}
                      title         = {widgetConfig.deleteConfirmPopup.title && widgetConfig.deleteConfirmPopup.title[this.props.i18n.language] ? surveyHelperNew.parseString(widgetConfig.deleteConfirmPopup.title[this.props.i18n.language] || widgetConfig.deleteConfirmPopup.title, this.props.interview, this.props.path) : null}
                      cancelAction  = {widgetConfig.deleteConfirmPopup.cancelAction}
                      confirmAction = {this.onRemoveGroupedObject}
                      containsHtml  = {widgetConfig.containsHtml}
                    />
                  </div>)
              }
            </div>
            {widgetsComponents}
          </div>
        </div>
      </div>
    );
  }
}

export default withTranslation()(withSurveyContext(GroupedObject))

