/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
// NOTE: no legacy import, can be moved to evolution-frontend
import React                          from 'react';
import { withTranslation }            from 'react-i18next';

class KeepDiscard extends React.Component {
  static KEEP = 'Keep';
  static DISCARD = 'Discard';
  
  constructor(props) {
    super(props);

    this.state = { choice: this.props.choice };

    this.onClick = (choice) => {
      this.setState({ choice: this.state.choice === choice ? undefined : choice });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.choice !== this.props.choice) {
      this.setState({ choice: this.props.choice });
    } else if (!this.props.onChange) {
      return;
    } else if ((prevState.choice === this.state.choice) && (prevState.personId === this.state.personId)) {
      return;
    } else {
      this.props.onChange({ choice: this.state.choice, personId: this.props.personId });
    }
  }

  render () {
      return <p>KeepDiscard.js legacy (to be replaced)</p>;
      return (
          <div className='_member-survey-keeper'>
              <button style={this.state.choice === KeepDiscard.KEEP ? {background: 'lightgreen'} : {}} className='_member-survey-keeper-left' type="button" onClick={this.onClick.bind(this, KeepDiscard.KEEP)}>
                  {this.props.t(`admin:interviewMember:${KeepDiscard.KEEP}`)}
              </button>

              <button style={this.state.choice === KeepDiscard.DISCARD ? {background: 'lightcoral'} : {}} className='_member-survey-keeper-right' type="button" onClick={this.onClick.bind(this, KeepDiscard.DISCARD)}>
                  {this.props.t(`admin:interviewMember:${KeepDiscard.DISCARD}`)}
              </button>
          </div>
      );
  }
}

const defaultExport = withTranslation()(KeepDiscard)

defaultExport.KEEP = KeepDiscard.KEEP
defaultExport.DISCARD = KeepDiscard.DISCARD

export default defaultExport
