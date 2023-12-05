# Documentation on base objects (Household/BaseHousehold, Person/BasePerson, etc.)

These base objects will be implemented first in admin/validation and will be created live during validation using the responses json data from the interview. Hoewever, later on, we willl migrate these to the questionnaire/client itself so we can have better typing and validations and make sure the data is more robust during data collection.

## Composition-based classes

In a specific survey project, you must create, for instance a Household object. This will auto create a BaseHousehold object which includes generic attributes like uuid (from Uuidable) size, persons/vehicles, associated Home, etc.

## Accessor/public attributes

Most attributes are public to make it easier to read/write to them (a questionnaire could have thousands of questionable attributes), but some specific attributes must have accessors, like the size attribute of Household, because in most surveys, we first ask the respondent for the household size and then we create the persons using this value. However, in the questionnaire, it is often possible to increase the number of persons after having declared the household size at the beginning. So the size attribute and the persons array must be checked for consistency.

## Validations

Most classes have a static create method which is a factory that takes dirty parameters from the interview data (json mostly), and validate the types of each attribute, and checks for missing required attributes. Eventually, these checks will be run during the interview itself, on the client. This is the first validation step. Then after the object is created with its validated params, the validate method can be run to validate logic and more-specific attributes validations, or validations related to more than one attribute. This is the second and final validation step. THis second step is only run in the backend by admins or validators, or in batch validation tasks.
