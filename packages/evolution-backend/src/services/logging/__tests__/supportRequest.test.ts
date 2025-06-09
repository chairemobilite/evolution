/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Transporter } from 'nodemailer';
import nodemailerMock from 'nodemailer-mock';
import { sendSupportRequestEmail } from '../supportRequest';
import { registerTranslationDir } from 'chaire-lib-backend/lib/config/i18next';

// Register translation directory for tests
registerTranslationDir(__dirname + '/../../../../../../locales/');

// Mock email transport
jest.mock('chaire-lib-backend/lib/services/mailer/transport', () => (nodemailerMock.createTransport({
    sendmail: true,
    newline: 'unix',
    path: '/usr/sbin/sendmail'
}) as any as Transporter));

const fromEmail = 'test@support.org';
const originalEnv = process.env;

beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.MAIL_FROM_ADDRESS = fromEmail;
    nodemailerMock.mock.reset();
});

afterAll(() => {
    process.env = originalEnv;
});

describe('sendSupportRequestEmail function', () => {
    test('sends email to single support address', async () => {
        // Setup
        const supportEmail = 'support@example.com';
        process.env.SUPPORT_REQUEST_EMAILS = supportEmail;
        const message = 'Help me with my survey';
        const userEmail = 'user@example.com';
        const interviewId = 12345;
        
        // Execute
        await sendSupportRequestEmail({
            message,
            userEmail,
            interviewId
        });
        
        // Verify
        const sentEmails = nodemailerMock.mock.getSentMail();
        expect(sentEmails.length).toBe(1);
        expect(sentEmails[0].from).toEqual(fromEmail);
        expect(sentEmails[0].to).toEqual(supportEmail);
        expect(sentEmails[0].text).toContain(message);
        expect(sentEmails[0].text).toContain(userEmail);
        expect(sentEmails[0].text).toContain(interviewId.toString());
        expect(sentEmails[0].html).toContain(message.replace(/\n/g, '<br/>'));
    });

    test('sends emails to multiple support addresses for same language', async () => {
        // Setup
        const supportEmails = 'support1@example.com,support2@example.com';
        process.env.SUPPORT_REQUEST_EMAILS = supportEmails;
        const message = 'Help me with my survey';
        
        // Execute
        await sendSupportRequestEmail({
            message
        });
        
        // Verify
        const sentEmails = nodemailerMock.mock.getSentMail();
        expect(sentEmails.length).toBe(1);
        expect(sentEmails[0].from).toEqual(fromEmail);
        expect(sentEmails[0].to).toEqual(supportEmails);
        expect(sentEmails[0].text).toContain(message);
        expect(sentEmails[0].text).toContain('Unknown User');
        expect(sentEmails[0].html).toBeDefined();
    });

    test('sends emails to different languages', async () => {
        // Setup
        process.env.SUPPORT_REQUEST_EMAILS = 'en:support-en@example.com;fr:support-fr@example.com';
        const message = 'Help me with my survey';
        const userEmail = 'user@example.com';
        
        // Execute
        await sendSupportRequestEmail({
            message,
            userEmail
        });
        
        // Verify
        const sentEmails = nodemailerMock.mock.getSentMail();
        expect(sentEmails.length).toBe(2);
        
        // Check both emails were sent to appropriate addresses with correct language content
        const enEmail = sentEmails.find(email => email.to === 'support-en@example.com');
        const frEmail = sentEmails.find(email => email.to === 'support-fr@example.com');
        
        expect(enEmail).toBeDefined();
        expect(frEmail).toBeDefined();
        expect(enEmail?.subject).not.toEqual(frEmail?.subject);
        expect(enEmail?.text).toContain(message);
        expect(frEmail?.text).toContain(message);
        expect(enEmail?.text).toContain(userEmail);
        expect(frEmail?.text).toContain(userEmail);
    });

    test('handles multiple emails per language', async () => {
        // Setup
        process.env.SUPPORT_REQUEST_EMAILS = 'en:support-en1@example.com,support-en2@example.com;fr:support-fr@example.com';
        const message = 'Help me with my survey';
        
        // Execute
        await sendSupportRequestEmail({
            message
        });
        
        // Verify
        const sentEmails = nodemailerMock.mock.getSentMail();
        expect(sentEmails.length).toBe(2); // One email per language group, not per recipient
        
        // Check emails were sent with multiple recipients for English
        const enEmail = sentEmails.find(email => email.to === 'support-en1@example.com,support-en2@example.com');
        const frEmail = sentEmails.find(email => email.to === 'support-fr@example.com');
        
        expect(enEmail).toBeDefined();
        expect(frEmail).toBeDefined();
    });

    test('throws error when no support emails configured', async () => {
        // Setup
        delete process.env.SUPPORT_REQUEST_EMAILS;
        
        // Execute and verify
        await expect(sendSupportRequestEmail({
            message: 'Test message'
        }))
            .rejects
            .toThrow('No support email addresses provided');
    });

    test('throws error when empty support emails string', async () => {
        // Setup
        process.env.SUPPORT_REQUEST_EMAILS = '';
        
        // Execute and verify
        await expect(sendSupportRequestEmail({
            message: 'Test message'
        }))
            .rejects
            .toThrow('No support email addresses provided');
    });

    test('handles no interview ID gracefully', async () => {
        // Setup
        process.env.SUPPORT_REQUEST_EMAILS = 'support@example.com';
        const message = 'Help me with my survey';
        const userEmail = 'user@example.com';
        
        // Execute
        await sendSupportRequestEmail({
            message,
            userEmail
        });
        
        // Verify
        const sentEmails = nodemailerMock.mock.getSentMail();
        expect(sentEmails.length).toBe(1);
        expect(sentEmails[0].text).toContain(message);
        expect(sentEmails[0].text).toContain(userEmail);
        expect(sentEmails[0].text).not.toContain('Interview ID');
    });

    test('handles no user email gracefully', async () => {
        // Setup
        process.env.SUPPORT_REQUEST_EMAILS = 'support@example.com';
        const message = 'Help me with my survey';
        const interviewId = 12345;
        
        // Execute
        await sendSupportRequestEmail({
            message,
            interviewId
        });
        
        // Verify
        const sentEmails = nodemailerMock.mock.getSentMail();
        expect(sentEmails.length).toBe(1);
        expect(sentEmails[0].text).toContain(message);
        expect(sentEmails[0].text).toContain('Unknown User');
        expect(sentEmails[0].text).toContain(interviewId.toString());
    });
    
    test('properly formats the survey URL', async () => {
        // Setup
        process.env.SUPPORT_REQUEST_EMAILS = 'support@example.com';
        process.env.HOST = 'https://survey.example.com';
        const message = 'Help with survey';
        
        // Execute
        await sendSupportRequestEmail({
            message
        });
        
        // Verify
        const sentEmails = nodemailerMock.mock.getSentMail();
        expect(sentEmails.length).toBe(1);
        expect(sentEmails[0].html).toContain('https://survey.example.com');
    });

    // New tests for currentUrl parameter
    test('includes currentUrl in email when provided', async () => {
        // Setup
        process.env.SUPPORT_REQUEST_EMAILS = 'support@example.com';
        const message = 'Help with this page';
        const currentUrl = 'https://survey.example.com/survey/page5';
        
        // Execute
        await sendSupportRequestEmail({
            message,
            currentUrl
        });
        
        // Verify
        const sentEmails = nodemailerMock.mock.getSentMail();
        expect(sentEmails.length).toBe(1);
        expect(sentEmails[0].text).toContain(currentUrl);
        expect(sentEmails[0].html).toContain(currentUrl);
    });
    
    test('includes currentUrl in emails to different language support teams', async () => {
        // Setup
        process.env.SUPPORT_REQUEST_EMAILS = 'en:support-en@example.com;fr:support-fr@example.com';
        const message = 'Help with this page';
        const currentUrl = 'https://survey.example.com/survey/page5';
        
        // Execute
        await sendSupportRequestEmail({
            message,
            currentUrl
        });
        
        // Verify
        const sentEmails = nodemailerMock.mock.getSentMail();
        expect(sentEmails.length).toBe(2);
        
        const enEmail = sentEmails.find(email => email.to === 'support-en@example.com');
        const frEmail = sentEmails.find(email => email.to === 'support-fr@example.com');
        
        expect(enEmail?.text).toContain(currentUrl);
        expect(frEmail?.text).toContain(currentUrl);
        expect(enEmail?.html).toContain(currentUrl);
        expect(frEmail?.html).toContain(currentUrl);
    });
    
    test('includes all parameters when provided', async () => {
        // Setup
        process.env.SUPPORT_REQUEST_EMAILS = 'support@example.com';
        const message = 'Help with this page';
        const userEmail = 'user@example.com';
        const interviewId = 12345;
        const currentUrl = 'https://survey.example.com/survey/page5';
        
        // Execute
        await sendSupportRequestEmail({
            message,
            userEmail,
            interviewId,
            currentUrl
        });
        
        // Verify
        const sentEmails = nodemailerMock.mock.getSentMail();
        expect(sentEmails.length).toBe(1);
        expect(sentEmails[0].text).toContain(message);
        expect(sentEmails[0].text).toContain(userEmail);
        expect(sentEmails[0].text).toContain(interviewId.toString());
        expect(sentEmails[0].text).toContain(currentUrl);
        expect(sentEmails[0].html).toContain(currentUrl);
    });
});
