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

## Prefilled Data System

Evolution supports prefilling survey objects with data from external sources before conducting interviews. This allows surveyors to import existing data about respondents and reduce the burden of data entry or detect changes, for instance household who moved. Home address is the usual example of  prefilled data.

### Overview

Prefilled data is stored in the `sv_interviews_prefill` database table and linked to interviews via a reference field (typically an access code or unique identifier). When an interview is created, the system can automatically populate survey objects with this prefilled data in the preData attribute of the survey opject.

### Key Attributes

#### `preData`

- **Purpose**: Stores custom prefilled data from external sources
- **Type**: `Record<string, unknown>` (flexible object structure)
- **Format**: Survey-specific; each project defines its own structure
- **Available on**: All survey objects
- **Use case**: Store any imported data that doesn't directly map to standard object attributes but may be useful for validation, display, or later processing

#### `preGeography`

- **Purpose**: Stores the original geographic location from the imported data
- **Type**: `GeoJSON.Feature<GeoJSON.Point>`
- **Available on**: Place and other location-based objects (Home, usual work and school places)
- **Use case**: Preserve the original imported location separate from the potentially corrected/validated `geography` attribute, allowing comparison between imported and final declared locations

### Data Flow

1. **Import**: External data is imported and stored in the `sv_interviews_prefill` table using the `importPreFilledResponses` task
2. **Mapping**: The import task maps CSV columns to survey object paths (e.g., `home.address`, `home.postalCode`)
3. **Geography Conversion**: If coordinates are provided, they are converted to GeoJSON points and stored in both `preGeography` (original) and `geography` (editable)
4. **Zone Calculation**: Intersecting geographic zones are pre-calculated and stored with the prefilled data
5. **Interview Creation**: When an interview starts, the system retrieves prefilled data using `getByReferenceValue()` based on the reference field (e.g., access code)
6. **Population**: Survey objects are created with both standard attributes and prefilled data in the `preData` attribute
7. **Validation**: Users can validate or modify prefilled data during the interview
8. **Preservation**: Original prefilled data remains in `preData` and `preGeography` for auditing and comparison

### Database Structure

The `sv_interviews_prefill` table contains:
- `reference_field` (string, unique, indexed): The key used to lookup prefilled data (e.g., access code)
- `responses` (JSON): The prefilled response data in the format:

  ```typescript
  {
      [path: string]: {
          value: unknown;
          actionIfPresent?: 'force' | 'doNothing'
      }
  }
  ```

### Import Task

The `importPreFilledResponses` task (`evolution-backend/src/tasks/importPreFilledResponses.task.ts`) provides a template for importing prefilled data from CSV files.

**Important**: This task is designed as an **example template** that can be customized for each survey project. If your CSV has different column names or structure, you must create a custom import task in your survey project.

#### Running the Task

```bash
yarn task:importPreFilledResponses -- --file /absolute/path/to/file.csv --type [optional-type]
```

#### CSV Format (Example)

The default task expects specific column names. **You must customize the task in the survey project directory if your CSV uses different column names**:
- `AccessCode`: Reference field to link data to interviews (required)
- `PostalCode`: Postal/ZIP code
- `Address`: Street address
- `AptNumber`: Apartment/unit number
- `City`: City name
- `Province`: Province/state
- `AddrLat`: Latitude coordinate
- `AddrLon`: Longitude coordinate
- `PhoneNumber`: Phone number
- Additional columns are preserved in `preData`

#### Import Process

1. **Parse CSV**: Reads the CSV file and extracts data row by row
2. **Store Original Data**: All non-blank fields are stored in `home.preData` for audit purposes
3. **Map to Survey Fields**: CSV columns are mapped to specific survey object paths:
   - `Address` → `home.address`
   - `City` → `home.city`
   - `PostalCode` → `home.postalCode`
   - `AptNumber` → `home.apartmentNumber`
   - `Province` → `home.region`
   - `PhoneNumber` → `home.homePhoneNumber`
4. **Convert Geography**: If coordinates are provided:
   - Creates GeoJSON Point feature from `AddrLat` and `AddrLon`
   - Saves to both `home.preGeography` (original, immutable) and `home.geography` (editable by user)
   - Sets `lastAction` property to `'preGeocoded'`
5. **Calculate Zones**: For geocoded locations, automatically calculates intersecting geographic zones and stores them with the prefilled data (requires zones to be imported first using chaire-lib importZones.task.ts, documented in Transition)

#### Creating a Custom Import Task

**Each survey project must create its own import task** tailored to their specific CSV format. To create a custom import task:

1. **Copy the Template**: Use `importPreFilledResponses.task.ts` as a starting point
2. **Create in Survey Project**: Place your custom task in `survey/src/tasks/` (e.g., `survey/src/tasks/importMyCustomData.task.ts`)
3. **Customize Column Mapping**: Update the column names to match your CSV:

   ```typescript
   const { MyAccessCodeColumn, MyAddressColumn, MyLatColumn, MyLonColumn } = data;
   ```

4. **Map to Survey Fields**: Adjust the field mappings to match your survey structure:

   ```typescript
   prefilledResponses['home.address'] = { value: MyAddressColumn };
   prefilledResponses['person.name'] = { value: MyNameColumn };
   ```

5. **Add Custom Logic**: Implement any data transformation, validation, or additional processing needed
6. **Register Task**: Add your task to the survey's `package.json` scripts

**Common customizations include**:
- Different CSV column names or structure
- Multiple target survey objects (Home, Person, Organization, etc.)
- Custom data transformation (e.g., date parsing, unit conversion)
- Additional validation or data cleaning
- Different reference field (e.g., email, phone number instead of access code)
- Custom geography conversion logic

### Configuration Requirements

To use prefilled data with geography conversion, surveys must provide:

1. **Import Task Configuration**: Customize the `importPreFilledResponses` task to map CSV columns to survey object attributes
2. **Geography Conversion**: The task handles coordinate conversion; surveys may need to provide address geocoding if coordinates are not available
3. **Reference Field**: The field used to link prefilled data to interviews (typically `accessCode`, configured in survey setup)
4. **Zone Datasets**: Load geographic zone data (e.g., census tracts, neighborhoods) for automatic zone assignment

### Implementation Notes

- Prefilled data is imported and stored **before** survey fielding begins
- Data is retrieved per interview using the reference field value
- The `actionIfPresent` flag controls whether to overwrite existing data ('force') or preserve user-entered data ('doNothing')
- Original imported data is preserved in `preData`/`preGeography` attributes even if the user modifies the main attributes during the interview
- This separation allows for:
  - Quality control and validation
  - Comparison between imported and final data
  - Audit trails for data modifications
  - Potential re-geocoding or correction workflows

## Future Developments

- Development of the enhancement process for interview data.
- Development of the weighting process for applicable objects.
- Enhancement of the auditing system with more sophisticated rules and processes.
