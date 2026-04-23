# Evolution

<!-- This markdown file is intended to be read in the typedoc generated site, not on github, links to specific types may not work here 
FIXME When the page for it is available, add a link here
-->

Evolution is a survey platform for travel survey. Its originality resides in the support of travel diaries, where participants in the survey can enter all the trips they did in a day for example, or other geographically aware complex questionnaires. It allows to develop flexible questionnaires, with multiple arbitrary sections, with complex conditions, validations, labels and choices, which can all be scripted to use any of the previous answers.

Surveys that use this platform are complete applications. They are scripted: questions and sections are defined in Typescript.

Typically, a survey application is split in 2 separate websites, one where participants can fill the questionnaire directly and another one for administering, monitoring, validating surveys, as well as for technical support to participants and phone interviewers.

## Survey development

Starting a new survey from scratch involves many steps.

The preferred approach is to define the questions and their behavior in an Excel file and use a generator script to generate the typescript code. See the documentation for the [generator](generator.md) for information on the format. The Evolution source code contains the [demo_generator](https://github.com/chairemobilite/evolution/tree/main/example/demo_generator) as an example project using the generator.

In addition to the generator files, Evolution also provides builtin modules and questions. These can be configured manually through a questionnaire configuration in typescript code. See the [`QuestionnaireConfiguration`](types/services_questionnaire_types_SectionConfig.QuestionnaireConfiguration.html) type for details. This configuration can then be passed to a [`QuestionnaireFactory`](classes/services_questionnaire.QuestionnaireFactory.html) class to automatically retrieve the sections and widget configuration for the questionnaire.

<!-- Here we could provide an example, but we should make sure it is always up to date and matches Evolution, we don't want to have to manually edit it.-->