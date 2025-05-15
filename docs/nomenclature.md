# Evolution Platform Nomenclature

## Interview and Questionnaire

* **Interview** All data related with an interview goes to the Interview object. It includes the Response (see below) and all metadata (interview id, language, validity, etc.).

* **Questionnaire** The configuration of widgets in each section

* **Widget** Any block of text, image, question or button appearing in the questionnaire, whether or not it would be associated with an Answer

* **Section** Part of the questionnaire having its own page during the interview

* **Answer** Answer to a specific question, field or attribute during the interview. An Answer can be generated automatically during RealTimeValidation

* **Response** Includes all the Answers to questions in the questionnaire from a respondent or an interviewer (associated with a single interview)

   a. **RespondentInterview**
      - Process where a respondent completes their own interview
      - Can be incomplete/abandoned
      - Creates a Response
   
   b. **AssistedInterview**
      - Interview conducted by an interviewer (phone/chat/in-person)
      - Can be starting fresh or continuing a RespondentInterview (becoming an AssistedInterview): as soon as an interviewer touches the interview, it becomes an AssistedInterview

    Respondent and assisted Response objects are identical in the flow process and are both called Response.
   
* **RealTimeValidation** (shorthand: **Validation**)
   - Frontend/backend validation during interview
   - Data type checking
   - Answers coherence verification
   - Applies to both interview types and to correction process (see below)

## Post-Interview Processing

1. **Audit** (automated) Backend process analyzing Responses (both respondent and assisted)

    * **AuditCheck** A single validation/check. Example: check if household size is consistent with the number of Person objects in the Response. Each AuditCheck has a type: error (which should be reviewed and eventually corrected or rejected), warning (which may be corrected but could be ignored, or could even result in a rejection in some cases), or note (just a message to classify the interview like "has at least one transit trip", "is a single person interview")

    * **AuditCheckResult** The result of an audit check on a specific Response or survey object in a Response (Household, Person, VisitedPlace, Trip, etc.). Example: If the household size does not equal the number of Person objects in the Response, the AuditCheckResult will be false

    * **AuditReport** All the AuditCheckResults for a single Response

2. **Review** (manual)
   - Evaluation of AuditReports
   - Decision-making process on interview validity
   - Determination if corrections are needed
   - Response acceptance or rejection

3. **Correction** (manual)
   - Direct editing of Responses
   - Data cleaning and improvement
   - The original Response is always kept separated from the CorrectedResponse before the correction process
   - Result is: **CorrectedResponse** (a CorrectedResponse can be incomplete. As soon as the correction process starts for an interview, a CorrectedResponse is generated as a duplicate of the original Response object). A flag must indicate that the correction process is complete or not.

4. **Enhancement** (automated)
   - Enhancement of Responses
   - Data improvement and quality enhancement
   - Result is: **EnhancedResponse** which takes as input a **CorrectedResponse** which must be completed
   - Example: associate each geographic point (home and visited places) in a Response with geographic boundaries such as a borough, a census area, a traffic analysis zone, etc. Another example would be to automatically calculate travel times and network distances for each trip by each mode for comparisons, no matter the declared mode.

### Monitoring and export

* **Monitoring**
   - Survey monitoring with widgets (e.g. plots of started/completed interviews by different variables)
   - Interviewers performance monitoring

* **Export**
   - Data extraction of original/uncorrected, corrected or enhanced Responses

## System Roles

* **SystemAuditor**
   - Generates an AuditReport for each Response. The AuditReport contains AuditCheckResult from each AuditCheck in config

* **SystemEnhancer**
   - Enhances each CorrectedResponse with calculated data or context-related data according to config

## Human Roles

A single user may have multiple roles (e.g., reviewer and corrector)

* **Respondent**
   - Provides Answers to a questionnaire during an RespondentInterview, generating a Response
   - Is a self-guided interview participant when doing a RespondentInterview
   - Gives Answers to an interviewer when in an AssistedInterview, generating a Response
   - Can be both if an interviewer is involved only in part of the interview

* **Interviewer**
   - Is a phone, chat or in-person support personnel
   - Guides respondents through interview process

* **Reviewer**
   - Evaluates audit reports
   - Makes decisions on responses validity
   - Determines necessary actions, like corrections needed

* **Corrector**
   - Implements required corrections
   - Adjusts geographic data
   - Modifies answers (output of all corrected answers in an interview: CorrectedResponse)

* **Admin**
   - Monitors survey
   - Manages data exports

## Role-Process Relationships
```
Respondent
    └── RespondentInterview + RealTimeValidation
        └── Response
            └── Answer

Interviewer
    └── AssistedInterview + RealTimeValidation
        └── Response
            └── Answer

Reviewer
    └── Review
        └── AuditReport
            └── AuditCheckResult

Corrector
    └── Correction + RealTimeValidation
        └── CorrectedResponse
            └── Answer

Admin
    ├── Monitoring
    └── Export
        ├── CorrectedResponse
        |   └── Answer
        └── EnhancedResponse
            └── Answer
```

## Collection
When any of these names are used in an array, list or vector, the term Collection is added as a suffix, with the object name in singular. Example: Response would be all the Answers for a single interview, and ResponseCollection would be the Responses for multiple interviews. Collection is more generic and more language agnostic than Array, List or Vector.