/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// NOTE: no legacy import except auth (use evolution-frontend), can be moved to evolution-frontend
import React               from 'react';
import { NavLink }         from 'react-router-dom';
import { connect }         from 'react-redux';
import { withTranslation } from 'react-i18next';
import moment              from 'moment-business-days';

import { startLogout, resetInterview } from '../../actions/shared/auth';
import config                          from 'chaire-lib-common/lib/config/shared/project.config';

export class Header extends React.Component {
  render() {
    return (
        <header className="header">
          <div className="header__content">
            <nav className="header__nav-left">
            <h1>{config.title[this.props.i18n.language]}</h1>
            </nav>
            <nav className="header__nav-right">
              { !this.props.user && this.props.path !== '/login' && config.showLogin !== false
                && <NavLink 
                  className = "menu-button"
                  key       = {`header__nav-login`}
                  to        = "/login"
                >
                  {this.props.t('menu:login')}
                </NavLink> }
              { this.props.user && config.showLogout !== false
                && <button
                  type      = "button"
                  className = "menu-button"
                  key       = {`header__nav-logout`}
                  onClick   = {this.props.startLogout}
                >
                  {this.props.t('menu:logout')}
                </button> }
              { config.languages.map((language) => {
                return this.props.i18n.language !== language ? (<button 
                    type      = "button"
                    className = "menu-button em"
                    lang      = {language}
                    key       = {`header__nav-language-${language}`}
                    onClick   = {() => {
                      this.props.i18n.changeLanguage(language);
                      moment.locale(this.props.i18n.language);
                    }}
                  >
                  {config.languageNames[language]}
                  </button>) : "";
              }) }
            </nav>
          </div>
        </header>
    );
  }
}

const mapStateToProps = (state) => {
  return {user: state.auth.user};
};

const mapDispatchToProps = (dispatch, props) => ({
  startLogout: (history) => dispatch(startLogout(props.history))
});

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(Header))