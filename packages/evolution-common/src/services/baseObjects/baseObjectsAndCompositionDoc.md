# This documentation is deprecated. See README.md in this folder for the latest documentation.

# Documentation on base objects (Household, Person, etc.)
These objects will be implemented first in admin/validation and will be created live during validation using the responses json data from the interview. However, later on, we willl migrate these to the questionnaire/client itself so we can have better typing and validations and make sure the data is more robust during data collection.
The BaseHousehold, BasePerson, etc. are deprecated but are kept for compatibility with older surveys which are still using them like od_mtl_2023 and od_qc_2023.

## Composition-based classes
Classes can have composed objects. For example, a Person can have multiple WorkPlace objects and SchoolPlace objects as a composed objects. The Place class can have an Address as a composed object. Composed objects are created automatically if included in the json params used to create the main parent object. The create function will validate params for the parent object and for the composed objects. Composed attributes are ignored in the first part of the parent class constructor, but are then send to each composed class for creation/validation.

## Named attributes
Each class have named attributes. These are the attributes that are part of the base attributes, and composed objects have them too. They are stored in the attributes object and are saved into a separate column in the database.

## Custom attributes
Each class can have custom attributes. These are attributes that are not part of the base attributes, and are not part of the composed objects (but composed objects themsleves can have custom attributes). They are stored in the customAttributes object. and are saved into a json field in the database.

## Accessor attributes
Each named attribute have accessors (get/set). Custom attributes do not have accessors. It is up to the specific project/survey using them to define accessors when needed.

## Validations/Audits
Most classes have a static create method which is a factory that takes dirty parameters from json data (interview data or other input data), and validate the types of each attribute, and checks for missing required attributes in both the parent class and the composed objects. Eventually, these checks will be run during the interview itself, on the client. This is the first validation step. Then after the object is created with its validated params, the validate method can be run to validate logic and more-specific attributes validations, or validations related to more than one attribute. This is the second and final validation step. This second step is only run in the backend by admins or validators, or in batch validation tasks (we also called these "after-interview" validations: audits). Custom attributes are not validated when creating the object, but should be inside the specific survey using them.

## About naming dates and times
The first method of naming dates and times in the previous base objecst was to use departureDate, departureTime, arrivalDate and arrivalTime. The main issue with this is that for instance, for a visitedPlace the arrival would be at the begignning and the departure would be at the end, while for a trip it would be the opposite and this created ambiguities. The solution is now to use startDate, startTime, endDate, endTime, and thus the order is always the same for all timed objects like VisitedPlace, Trip, Junction, Segment, Journey, etc.

