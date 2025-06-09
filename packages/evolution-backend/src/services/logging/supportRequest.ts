/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import url from 'url';
import i18n from 'chaire-lib-backend/lib/config/i18next';
import mailTransport from 'chaire-lib-backend/lib/services/mailer/transport';

// Return a key/value object where the key is the language code and the value is an array of email addresses
const getSupportRequestRecipientsWithLanguage = (): Record<string, string[]> => {
    // Parse the SUPPORT_REQUEST_EMAILS environment variable to support language preferences
    const supportEmailsConfig = process.env.SUPPORT_REQUEST_EMAILS;
    if (!supportEmailsConfig) {
        throw new Error(
            'No support email addresses provided. You need to specify the SUPPORT_REQUEST_EMAILS environment variable in a format containing the language followed by an array of email addresses separated by commas. For example "en:email1@example.com,email2@example.com;fr:email3@example.com"'
        );
    }

    // Suggested format: "en:email1@example.com,email2@example.com;fr:email3@example.com"
    const supportEmailsByLanguage: Record<string, string[]> = {};
    supportEmailsConfig.split(';').forEach((languageGroup) => {
        const [language, emails] = languageGroup.split(':');
        if (language && emails) {
            supportEmailsByLanguage[language.trim()] = emails.split(',').map((email) => email.trim());
        } else if (language) {
            // No ':' to specify the language, this variable thus represents the email addresses for the default language
            const lang = i18n().language;
            supportEmailsByLanguage[lang] = language.split(',').map((email) => email.trim());
        }
    });

    if (Object.keys(supportEmailsByLanguage).length === 0) {
        throw new Error(
            'No support email addresses provided. You need to specify the SUPPORT_REQUEST_EMAILS environment variable in a format containing the language followed by an array of email addresses separated by commas. For example "en:email1@example.com,email2@example.com;fr:email3@example.com"'
        );
    }
    return supportEmailsByLanguage;
};

const getSurveyUrl = (href: string = ''): URL => {
    const host = process.env.HOST || 'http://localhost:8080';
    return new url.URL(`${href}`, host);
};

const prepareSupportRequestEmail = (
    lang: string,
    {
        message,
        userEmail,
        interviewId,
        currentUrl
    }: {
        message: string;
        userEmail?: string;
        interviewId?: number;
        currentUrl?: string;
    }
): { subject: string; text: string; html: string } => {
    const translate = lang ? i18n().getFixedT(lang) : i18n().getFixedT(i18n().language);

    const surveyUrl = getSurveyUrl();
    const translateKeys = {
        surveyName: surveyUrl.hostname,
        userEmail: userEmail || 'Unknown User',
        message: message,
        supportInterviewID:
            interviewId === undefined
                ? ''
                : translate(['customServer:supportInterviewID', 'server:supportInterviewID'], { interviewId }),
        currentPageUrl:
            currentUrl === undefined
                ? ''
                : translate(['customServer:currentPageUrl', 'server:currentPageUrl'], {
                    currentUrl,
                    interpolation: { escapeValue: false }
                }),
        // To avoid escaping html characters
        interpolation: { escapeValue: false }
    };

    const textTranslateStrings = ['customServer:supportRequestMessage', 'server:supportRequestMessage'];
    const textMsg = translate(textTranslateStrings, translateKeys);
    const htmlTranslateKeys = Object.assign({}, translateKeys, {
        surveyName: `<a href="${surveyUrl.href}">${surveyUrl.href}</a>`
    });
    const htmlMsg = translate(textTranslateStrings, htmlTranslateKeys).replace(/\n/g, '<br/>');

    const subject = translate(['customServer:supportRequestSubject', 'server:supportRequestSubject'], {
        surveyName: surveyUrl.hostname
    });
    return {
        subject: subject,
        text: textMsg,
        html: htmlMsg
    };
};

/**
 * Send a support request email to support staff. The email will be send to the
 * email addresses specified by the  SUPPORT_REQUEST_EMAILS environment variable
 * in a format containing the language followed by an array of email addresses
 * separated by commas. For example
 * "en:email1@example.com,email2@example.com;fr:email3@example.com"
 *
 * @param options The options for the support request email
 * @param options.message The support request message
 * @param [options.userEmail] The email of the user who made the request
 * @param [options.interviewId] Optional interview ID associated with the request
 * @param [options.currentUrl] Optional current URL to include in the email
 */
export const sendSupportRequestEmail = async ({
    message,
    userEmail,
    interviewId,
    currentUrl
}: {
    message: string;
    userEmail?: string;
    interviewId?: number;
    currentUrl?: string;
}): Promise<void> => {
    try {
        const supportEmails = getSupportRequestRecipientsWithLanguage();

        const transport = mailTransport;
        if (transport === null) {
            throw new Error('Mail transport configuration error. Support email cannot be sent');
        }

        const promises: Promise<void>[] = [];

        for (const lang in supportEmails) {
            const emailMessage = prepareSupportRequestEmail(lang, { message, userEmail, interviewId, currentUrl });

            const mailOptions = {
                from: process.env.MAIL_FROM_ADDRESS,
                to: supportEmails[lang].join(','),
                ...emailMessage
            };

            promises.push(transport.sendMail(mailOptions));
        }
        await Promise.all(promises);

        console.log('Support request email sent successfully');
    } catch (error) {
        console.error('Error sending support request email: ', error);
        console.error(
            `Support request could not be send for interview ${interviewId === undefined ? 'unknown' : interviewId}: ${userEmail !== undefined ? `(from: ${userEmail})` : ''} ${message}`
        );
        throw error;
    }
};
