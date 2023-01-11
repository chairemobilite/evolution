/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';

export const InputLoading: React.FunctionComponent<WithTranslation> = (props: WithTranslation) => (
    <div className="loader">
        <p>{props.t('main:Loading')}...</p>
        {/*<img className="loader__image" src="/images/loader.gif" />*/}
    </div>
);

export default withTranslation()(InputLoading);
