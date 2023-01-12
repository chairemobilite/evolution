/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { faPlay } from '@fortawesome/free-solid-svg-icons/faPlay';

import surveyHelper from 'evolution-legacy/lib/helpers/survey/survey';

export const registrationCompletedBeforeStartButton = {
  type: "text",
  containsHtml: true,
  text: {
    fr: function(interview, path, user) {
      if (user.google_id || user.facebook_id)
      {
        return "";
      }
      return `
      <div class="center">
        <p class="apptr__form__label-standalone">Nous avons généré un mot de passe pour vous permettre de vous connecter à l'enquête sur un autre ordinateur ou plus tard si vous n'avez pas encore terminé l'entrevue.</p>
        <p class="_green _large _strong">Votre mot de passe:</p>
        <p class="_xlarge _orange _strong">${user.generated_password}</p>
      </div>
      `;
    },
    en: function(interview, path, user) {
      if (user.google_id || user.facebook_id)
      {
        return "";
      }
      return `
      <div class="center">
        <p class="apptr__form__label-standalone">We generated a password so you can connect to your interview on another device or if you did not complete the interview on your first connection.</p>
        <p class="_green _large _strong">Your password:</p>
        <p class="_xlarge _orange _strong">${user.generated_password}</p>
      </div>
      `;
    }
  }
};

export const registrationCompletedStartButton = {
  type: "button",
  color: "green",
  label: {
    fr: "Débuter",
    en: "Start"
  },
  path: "registrationCompletedStartButton",
  icon: faPlay,
  align: 'center',
  action: surveyHelper.validateButtonAction
};

export const registrationCompletedAfterStartButton = {
  type: "text",
  containsHtml: true,
  text: {
    fr: function(interview, path, user) {
      return `
      <div class="center">
        <p class="_blue _em">Merci pour votre participation!</p>
      </div>
      `;
    },
    en: function(interview, path, user) {
      return `
      <div class="center">
        <p class="_blue _em">Thank you for your participation!</p>
      </div>
      `;
    }
  }
};