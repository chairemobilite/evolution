# Documentation on Survey Objects (Household, Person, etc.)

These objects are used throughout the Evolution platform for data collection, validation, and analysis. They provide strong typing, validation, and composition capabilities for survey data structures.

## Composition-based classes
Classes can have composed objects. For example, a Person can have multiple WorkPlace objects and SchoolPlace objects as composed objects. A Person can also have multiple Journey objects, and each Journey can have VisitedPlace, Trip, and TripChain objects. The Place class can have an Address as a composed object. Composed objects are created automatically if included in the json params used to create the main parent object. The create function will validate params for the parent object and for the composed objects. Composed attributes are ignored in the first part of the parent class constructor, but are then sent to each composed class for creation/validation.

## Named attributes
Each class has named attributes. These are the attributes that are part of the core object structure, and composed objects have them too. They are stored in the attributes object and are saved into separate columns in the database.

## Custom attributes
Each class can have custom attributes. These are attributes that are not part of the named attributes, and are not part of the composed objects (but composed objects themselves can have custom attributes). They are stored in the customAttributes object and are saved into a json field in the database.

## Accessor attributes
Each named attribute has accessors (get/set). Custom attributes do not have accessors. It is up to the specific project/survey using them to define accessors when needed.

## Validations/Audits
Most classes have a static create method which is a factory that takes dirty parameters from json data (interview data or other input data), and validate the types of each attribute, and checks for missing required attributes in both the parent class and the composed objects. Eventually, these checks will be run during the interview itself, on the client. This is the first validation step. Then after the object is created with its validated params, the validate method can be run to validate logic and more-specific attributes validations, or validations related to more than one attribute. This is the second and final validation step. This second step is only run in the backend by admins or validators, or in batch validation tasks (we also called these "after-interview" validations: audits). Custom attributes are not validated when creating the object, but should be inside the specific survey using them.

## About naming dates and times
The current approach for naming dates and times uses a consistent pattern: startDate, startTime, endDate, endTime. This eliminates ambiguities that existed with previous naming conventions (departureDate/arrivalDate). The order is always the same for all timed objects like VisitedPlace, Trip, Junction, Segment, Journey, etc., where start represents the beginning of the activity/period and end represents the conclusion.

