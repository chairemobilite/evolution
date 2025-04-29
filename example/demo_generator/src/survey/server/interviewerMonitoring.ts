import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import _get from 'lodash/get';
import helper from '../helper';

// Time boundaries of periods
const amPeakEnd = 10 * 3600;
const pmPeakStart = 15 * 3600;
const pmPeakEnd = 18 * 3600;
const eveningEnd = 23 * 3600;

const motifsArr = ['work', 'study', 'onTheRoad', 'MRLVS', 'accompany', 'return', 'other', 'refusal'];
const periodsArr = ['pointeAm', 'day', 'pointePm', 'evening', 'night'];

const interviewerData = {
    data: (responses) => {
        // get interview main timestamps:
        const completedAtTimestamp = responses._completedAt ? responses._completedAt : null;

        // get trips and driving license counts:
        let drivingLicensesCount = 0;
        let tripsCount = 0;
        const persons = _get(responses, 'household.persons', {});
        let countInterviewablePersons = 0;
        let countPersonsRespondedTrips = 0;
        let countPersonsDidTrips = 0;
        const motifs = motifsArr.reduce((objMotifs, motif) => {
            objMotifs[motif] = 0;
            return objMotifs;
        }, {});
        const periods = periodsArr.reduce((objPeriods, period) => {
            objPeriods[period] = 0;
            return objPeriods;
        }, {});
        const modes = {
            car: 0,
            transit: 0,
            other: 0,
            bicycle: 0,
            walk: 0
        };

        for (const personUuid in persons) {
            const person = persons[personUuid];
            if (helper.hasAge(person) && helper.ageCompare(person, 5) >= 0) {
                countInterviewablePersons++;
            }
            if (person.personDidTrips === true || person.personDidTrips === 'yes') {
                const trips = _get(persons[personUuid], 'trips', {});
                const visitedPlaces = _get(persons[personUuid], 'visitedPlaces', {});
                tripsCount += Object.keys(trips).length;
                countPersonsRespondedTrips += 1;
                countPersonsDidTrips += 1;
                // Get trip activity and time of day
                for (const tripUuid in trips) {
                    const trip = trips[tripUuid];
                    const origin = helper.getOrigin(trip, visitedPlaces);
                    const destination = helper.getDestination(trip, visitedPlaces);
                    if (_isBlank(origin) || _isBlank(destination)) {
                        console.log('Trip has no origin or destination');
                        continue;
                    }
                    const actCat = destination.activityCategory;
                    const activity = destination.activity;
                    const departureTime = origin.departureTime;
                    if (_isBlank(actCat) || _isBlank(activity) || _isBlank(departureTime)) {
                        // Trip is invalid
                        console.log('Trip is invalid (cat, activity, departure)', actCat, activity, departureTime);
                    }
                    const motif =
                        actCat === 'home'
                            ? 'return'
                            : activity === 'workOnTheRoad'
                                ? 'onTheRoad'
                                : actCat === 'work'
                                    ? 'work'
                                    : actCat === 'school'
                                        ? 'study'
                                        : activity === 'dropSomeone' || activity === 'fetchSomeone'
                                            ? 'accompany'
                                            : [
                                                'service',
                                                'restaurant',
                                                'shopping',
                                                'leisureArtsMusicCulture',
                                                'leisureSports',
                                                'leisureTourism',
                                                'medical'
                                            ].includes(activity)
                                                ? 'MRLVS'
                                                : 'other';
                    motifs[motif] += 1;
                    const time =
                        departureTime <= amPeakEnd
                            ? 'pointeAm'
                            : departureTime <= pmPeakStart
                                ? 'day'
                                : departureTime <= pmPeakEnd
                                    ? 'pointePm'
                                    : departureTime <= eveningEnd
                                        ? 'evening'
                                        : 'night';
                    periods[time] += 1;
                }
            } else if (person.personDidTrips === false || person.personDidTrips === 'no') {
                countPersonsRespondedTrips += 1;
            }
            if (persons[personUuid].drivingLicenseOwner === true || persons[personUuid].drivingLicenseOwner === 'yes') {
                drivingLicensesCount++;
            }
        }
        if (countPersonsRespondedTrips !== countInterviewablePersons) {
            tripsCount = null;
        }

        // get section completed status:
        // !!! here there was an error in the code for household members section, which was not registered in the actions and the startedAt was never saved.
        const sectionsCompleted = {
            sectionHome:
                !!_get(responses, '_sections.householdMembers._startedAt', null) ||
                !!_get(responses, '_sections.home._isCompleted', null),
            sectionHouseholdMembers: !!_get(responses, '_sections.householdMembers._isCompleted', null),
            sectionTrips: !!_get(responses, '_sections.end._startedAt', null),
            sectionEnd: completedAtTimestamp !== null
        };
        // get home geography and household car number:
        const carNumber = _get(responses, 'household.carNumber', null);

        return {
            nbPersons: _get(responses, 'household.size', null),
            nbTrips: tripsCount,
            nbPersonsOver5: countInterviewablePersons,
            nbPersonsDidTrips: countPersonsDidTrips,
            nbDrivingLicenses: drivingLicensesCount,
            householdCarNumber: carNumber,
            homeOwnership: _get(responses, 'household.ownership', null),
            income: _get(responses, 'household.income', null),
            ...sectionsCompleted,
            ...motifs,
            ...periods
        };
    },
    aggregate: (dataForInterviewer: any[]) => {
        const interviewerData = {
            interviewCount: dataForInterviewer.length,
            nbPersons: 0,
            nbTrips: 0,
            nbPersonsOver5: 0,
            nbPersonsDidTrips: 0,
            nbDrivingLicenses: 0,
            nbHomeOwnershipAnswered: 0,
            nbHomeOwnershipTenant: 0,
            nbIncomeAnswered: 0,
            nbIncomeRefusal: 0,
            nbSectionHomeCompleted: 0,
            nbSectionHouseholdCompleted: 0,
            nbSectionTripsCompleted: 0,
            nbSectionEndCompleted: 0
        };
        motifsArr.forEach((motif) => (interviewerData[motif] = 0));
        periodsArr.forEach((period) => (interviewerData[period] = 0));
        dataForInterviewer.forEach((data) => {
            interviewerData.nbPersons += !_isBlank(data.nbPersons) ? data.nbPersons : 0;
            interviewerData.nbTrips += !_isBlank(data.nbTrips) ? data.nbTrips : 0;
            interviewerData.nbPersonsOver5 += !_isBlank(data.nbPersonsOver5) ? data.nbPersonsOver5 : 0;
            interviewerData.nbPersonsDidTrips += !_isBlank(data.nbPersonsDidTrips) ? data.nbPersonsDidTrips : 0;
            (interviewerData.nbDrivingLicenses += data.nbDrivingLicenses),
            (interviewerData.nbHomeOwnershipAnswered += !_isBlank(data.homeOwnership) ? 1 : 0);
            interviewerData.nbHomeOwnershipTenant += data.homeOwnership === 'tenant' ? 1 : 0;
            interviewerData.nbIncomeAnswered += !_isBlank(data.income) ? 1 : 0;
            (interviewerData.nbIncomeRefusal += data.income === 'refusal' ? 1 : 0),
            (interviewerData.nbSectionHomeCompleted += data.sectionHome === true ? 1 : 0);
            interviewerData.nbSectionHouseholdCompleted += data.sectionHouseholdMembers === true ? 1 : 0;
            interviewerData.nbSectionTripsCompleted += data.sectionTrips === true ? 1 : 0;
            interviewerData.nbSectionEndCompleted += data.sectionEnd === true ? 1 : 0;
            motifsArr.forEach((motif) => (interviewerData[motif] += !_isBlank(data[motif]) ? data[motif] : 0));
            periodsArr.forEach((period) => (interviewerData[period] += !_isBlank(data[period]) ? data[period] : 0));
        });
        return interviewerData;
    }
};

export default interviewerData;
