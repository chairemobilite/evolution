# Survey End Date Feature

This feature allows the server to automatically display a "Thank You" page when the survey end date has passed, preventing new responses after the configured end date.

## Configuration

To enable this feature, set the `endDateTimeWithTimezoneOffset` in your project configuration file:

```typescript
// In your config.js or similar configuration file
export default {
    // ... other config
    endDateTimeWithTimezoneOffset: '2025-12-31T23:59:59-05:00'  // ISO 8601 format with timezone
}
```

The date format must be ISO 8601 with timezone offset: `YYYY-MM-DDTHH:MM:SS±HH:MM`

## How it Works

1. **Server Check**: When a request comes for the participant app, the server checks if the current time is after the configured `endDateTimeWithTimezoneOffset`.

2. **App Routing**: 
   - If the survey is still active, the normal survey app is served
   - If the survey has ended, a special "Survey Ended" app is served with a thank you message

3. **Localization**: The thank you message supports multiple languages through the localization files.

## Components

### Backend

- **surveyStatus.ts**: Contains the `isSurveyEnded()` function that checks if the current time is past the end date

### Frontend

- **SurveyEndedPage.tsx**: React component that displays the thank you message
- **app-survey-ended.tsx**: Application entry point for the survey ended bundle

### Build Configuration

- **webpack.config.js**: Updated with multiple entry points to build both survey and survey-ended apps

### Localization

Add translations in your locale files under `surveyEnded.thankYouMessage`:

**English** (`locales/en/survey.json`):
```json
{
    "surveyEnded": {
        "thankYouMessage": "<h2 class=\"_dark-green _strong center\">Thank you for your interest!</h2><p class=\"center\">This survey has ended and is no longer accepting new responses.</p><p class=\"center\">We greatly appreciate your interest in participating.</p>"
    }
}
```

**French** (`locales/fr/survey.json`):
```json
{
    "surveyEnded": {
        "thankYouMessage": "<h2 class=\"_dark-green _strong center\">Merci de votre intérêt!</h2><p class=\"center\">Cette enquête est terminée et n'accepte plus de nouvelles réponses.</p><p class=\"center\">Nous apprécions grandement votre intérêt à participer.</p>"
    }
}
```

## Building

The webpack configuration now uses multiple entry points, so building the main survey app automatically builds both the regular survey and the survey-ended app:

```bash
# Development build with watch mode (builds both apps)
yarn build:dev

# Production build (builds both apps)
yarn build:prod
```

This single build command will generate both:
- `index-survey-{projectName}.html` and `survey-{projectName}-bundle.js` for the main survey
- `index-survey-ended-{projectName}.html` and `survey-ended-{projectName}-bundle.js` for the ended survey

## Testing

To test this feature:

1. Set `endDateTimeWithTimezoneOffset` to a date in the past
2. Build both apps (main and survey-ended)
3. Start the server
4. Visit the home page - you should see the thank you message instead of the survey

## Notes

- The date check happens on every request, so there's no need to restart the server when the end date is reached
- The date check affects only the application servicing, to fetch the application bundle, not every request, so a participant filling an interview when the survey end date is reached will still be able to complete. But he will not be able to continue after refreshing the page with F5.
- The feature gracefully handles invalid dates by defaulting to keeping the survey active
- If no end date is configured, the survey remains active indefinitely
- The survey ended page includes the same banner and logo as the home page for consistent branding
