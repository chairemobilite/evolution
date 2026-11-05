/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type {
    InterviewVisitContext,
    JourneyVisitContext,
    PersonVisitContext,
    SegmentVisitContext,
    SurveyObjectVisitor,
    TripVisitContext
} from 'evolution-common/lib/services/baseObjects/walkSurveyObjects';
import { CsvRow, ExportableSurveyObject, surveyObjectToCsvRow } from './surveyObjectToCsvRow';
import type { SurveyObjectsCsvWriter } from './SurveyObjectsCsvWriter';

/**
 * Columns identifying an object and linking it to its interview and parent,
 * in the order they are written at the start of each file. A file only has
 * the columns of its object type.
 */
export const leadingColumns = ['_uuid', '_interviewUuid', '_householdUuid', '_personUuid', '_journeyUuid', '_tripUuid'];

/** A survey object, with its uuid */
type VisitedObject = ExportableSurveyObject & { uuid?: string };

/**
 * Visitor writing the survey objects of an interview to the CSV files of the
 * export, with one row per object. Each row contains the attributes and
 * custom attributes of the object, the uuid of its interview and the uuid of
 * its parent object, in a column named after the parent type.
 */
export class CsvExportVisitor implements SurveyObjectVisitor {
    private readonly writer: SurveyObjectsCsvWriter;

    /**
     * @param {SurveyObjectsCsvWriter} writer - Writer of the CSV files of the export
     */
    constructor(writer: SurveyObjectsCsvWriter) {
        this.writer = writer;
    }

    visitInterview = (interview: VisitedObject, context: InterviewVisitContext) =>
        this.writeRow('interview', interview, context);

    visitHome = (home: VisitedObject, context: InterviewVisitContext) => this.writeRow('home', home, context);

    visitHousehold = (household: VisitedObject, context: InterviewVisitContext) =>
        this.writeRow('household', household, context);

    visitPerson = (person: VisitedObject, context: PersonVisitContext) =>
        this.writeRow('person', person, context, { _householdUuid: context.household.uuid });

    visitJourney = (journey: VisitedObject, context: JourneyVisitContext) =>
        this.writeRow('journey', journey, context, { _personUuid: context.person.uuid });

    // The location of a visited place is in its composed place, exported in the same row
    visitVisitedPlace = (visitedPlace: VisitedObject & { place?: ExportableSurveyObject }, context: TripVisitContext) =>
        this.writeRow('visitedPlace', visitedPlace, context, {
            ...(visitedPlace.place ? surveyObjectToCsvRow(visitedPlace.place, 'place') : {}),
            _journeyUuid: context.journey.uuid
        });

    visitTrip = (trip: VisitedObject, context: TripVisitContext) =>
        this.writeRow('trip', trip, context, { _journeyUuid: context.journey.uuid });

    visitSegment = (segment: VisitedObject, context: SegmentVisitContext) =>
        this.writeRow('segment', segment, context, { _tripUuid: context.trip.uuid });

    /**
     * Write the row of an object to the file of its type
     *
     * @param {string} objectType - Type of the object
     * @param {VisitedObject} object - The object to write
     * @param {InterviewVisitContext} context - Context of the object
     * @param {CsvRow} [additionalColumns] - Columns to add to the attributes of the object
     * @returns {Promise<void>}
     */
    private writeRow(
        objectType: string,
        object: VisitedObject,
        context: InterviewVisitContext,
        additionalColumns: CsvRow = {}
    ): Promise<void> {
        return this.writer.writeRow(objectType, {
            ...surveyObjectToCsvRow(object),
            ...additionalColumns,
            _uuid: object.uuid,
            _interviewUuid: context.interview.uuid
        });
    }
}
