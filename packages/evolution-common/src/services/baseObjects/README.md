# Survey Objects Overview

This document provides an overview of the key objects used in evolution. These objects are designed to handle various aspects of survey data collection, processing, and analysis.

## Core Objects

### Interview

The `Interview` class is the central object in our survey system. It represents a single interview and contains all the data collected during that interview.

- **Attributes**: Includes basic interview information such as UUID, access code, assigned date, contact information, etc.
- **Relationships**: Can be associated with a Household, Person, or Organization.
- **Key Features**: Handles interview realtime data validation (TODO) and serialization.

### InterviewParadata

The `InterviewParadata` class manages metadata related to the interview process.

- **Definition**: Paradata is data about the survey/interview process itself: data that is not the main data being collected in the survey, but that is collected during the interview process. It can be used for example to know when a section or a question was responded/completed, or how many times a question was answered. It can also be used to detect anomalies in the interview process, like a section being skipped or a question being answered twice.
- **Attributes**: Includes start/update/completion timestamps, source, language information, browser data, and section/widget interaction data.
- **Key Features**: Provides insights into the interview process and user interactions.

### InterviewAudited

The `InterviewAudited` class composed of the basic Interview object with audit results and auditor/admin auditing flags.

- **Attributes**: Includes flags for validity, completion, and questionability, as well as audit results.
- **Key Features**: Implements the `IAudited` interface for standardized audited objects.

### InterviewUnserializer

The `InterviewUnserializer` and `InterviewParadataUnserializer` classes are utilities for deserializing interview and interview paradata.

- **Key Features**: Provides methods for deserializing interview data, including handling of nested objects and arrays.

## Related Objects

### Household

Represents a household in the survey context.

- **Attributes**: (TODO)
- **Relationships**: Can be associated with multiple Persons and an Interview.

### Person

Represents an individual respondent in the survey.

- **Attributes**: (TODO)
- **Relationships**: Can be associated with a Household and an Interview.

### Organization

Represents an organization in the context of organizational surveys.

- **Attributes**: (TODO)
- **Relationships**: Can be associated with an Interview.

## Utility Interfaces and Types

### IAudited

An interface that defines the structure for objects that has been audited.

- **Methods**: `isValid()`, `isCompleted()`, `isQuestionable()`, `getAudits()`, `setValid()`, `setCompleted()`, `setQuestionable()`, `getAuditedObject()`, `getOriginalInterviewId()`

### Audit

A type representing an individual audit entry.

- **Attributes**: version, level, errorCode, message

## Data Flow and Processes

1. **Interview Creation**: An Interview object is created when a respondent starts a survey.
2. **Data Collection**: As the respondent progresses through the survey, the Interview object is populated with response and paradata.
3. **Auditing**: After completion, the InterviewAudited object is created to facilitate the auditing process.
4. **Enhancement**: Additional attributes and statistics are calculated and added to the interview data, subpart of the auditing process.
5. **Weighting**: (If applicable) Weighting is applied to relevant objects (e.g., Household, Person) to adjust for population representation.
6. **Export**: Processed and audited data is prepared for export and analysis. There are three types of exported data: original unmodified response data, audited interview data and admin/analysis data (including audited data, paradata and confidential attributes).

## Future Developments

- Development of the enhancement process for interview data.
- Development of the weighting process for applicable objects.
- Enhancement of the auditing system with more sophisticated rules and processes.
