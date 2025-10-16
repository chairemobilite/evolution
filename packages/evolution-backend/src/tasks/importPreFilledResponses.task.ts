/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import pQueue from 'p-queue';

import taskWrapper from 'chaire-lib-backend/lib/tasks/taskWrapper';
import { fileManager } from 'chaire-lib-backend/lib/utils/filesystem/fileManager';
import { parseCsvFile } from 'chaire-lib-backend/lib/services/files/CsvFile';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { setPreFilledResponse } from '../services/interviews/serverFieldUpdate';
import zonesDbQueries from 'chaire-lib-backend/lib/models/db/zones.db.queries';

class PreFilledResponses {
    async run(argv) {
        const fileName = argv['file'];
        const type = argv['type'];
        if (!fileName) {
            throw 'Must specify the file to import as --file /absolute/path/to/file';
        }
        if (!fileManager.fileExistsAbsolute(fileName)) {
            throw `File ${fileName} does not exist. It must be the absolute path to the file`;
        }
        const preFilledInterviews = {};
        await parseCsvFile(
            fileName,
            (data, rowNum) => {
                const { AccessCode, PostalCode, Address, AptNumber, City, Province, AddrLat, AddrLon, PhoneNumber } =
                    data;
                if (_isBlank(AccessCode)) {
                    console.log('Invalid access code', AccessCode, rowNum);
                    return;
                }
                const prefilledResponses = {};
                // Filter the non blank data properties
                const properties: any = {};
                Object.keys(data)
                    .filter((key) => !_isBlank(data[key]))
                    .forEach((key) => {
                        properties[key] = data[key];
                    });
                if (!_isBlank(type)) {
                    properties.type = type;
                }
                // Save the original additional data in a field safe from overwrite:
                prefilledResponses['home.preData'] = { value: properties };

                // Save the fields that will be prefilled in the questionnaire
                if (!_isBlank(Address)) {
                    prefilledResponses['home.address'] = { value: Address };
                }
                if (!_isBlank(City)) {
                    prefilledResponses['home.city'] = { value: City };
                }
                if (!_isBlank(PhoneNumber)) {
                    prefilledResponses['home.homePhoneNumber'] = { value: PhoneNumber };
                }
                if (!_isBlank(AptNumber)) {
                    prefilledResponses['home.apartmentNumber'] = { value: AptNumber };
                }
                if (!_isBlank(Province)) {
                    prefilledResponses['home.region'] = { value: Province };
                }
                if (!_isBlank(PostalCode)) {
                    prefilledResponses['home.postalCode'] = { value: PostalCode };
                }
                let lonLat: [number, number] | undefined = undefined;
                if (!_isBlank(AddrLat) && !_isBlank(AddrLon)) {
                    lonLat = [Number(AddrLon), Number(AddrLat)];
                }
                if (lonLat) {
                    const baseGeographyFeature = {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: lonLat }
                    };
                    // Save as the original geography safe from overwrite:
                    prefilledResponses['home.preGeography'] = {
                        value: {
                            ...baseGeographyFeature,
                            properties: {
                                lastAction: 'preGeocoded'
                            }
                        }
                    };
                    // Save the geography to use as default value
                    prefilledResponses['home.geography'] = {
                        value: {
                            ...baseGeographyFeature,
                            properties: {
                                lastAction: 'preGeocoded'
                            }
                        }
                    };
                }

                if (Object.keys(prefilledResponses).length > 0) {
                    preFilledInterviews[AccessCode] = prefilledResponses;
                } else {
                    console.log('No data to save for line', rowNum);
                }
            },
            { header: true }
        );

        const dataCount = Object.keys(preFilledInterviews).length;
        console.log(`Found ${dataCount} prefilled data to save`);
        console.log('Saving prefilled data...');
        const promiseQueue = new pQueue({ concurrency: 10 });
        let processedCount = 0;
        Object.keys(preFilledInterviews).forEach((refValue) => {
            promiseQueue.add(async () => {
                const preFilledResponses = preFilledInterviews[refValue];
                if (preFilledResponses['home.geography']) {
                    // Pre calculate zones for the geography
                    const intersectingZones = await zonesDbQueries.getZonesContaining(
                        preFilledResponses['home.geography'].value
                    );
                    for (let i = 0; i < intersectingZones.length; i++) {
                        if (!_isBlank(intersectingZones[i].dsShortname) && !_isBlank(intersectingZones[i].shortname)) {
                            preFilledResponses[`home.${intersectingZones[i].dsShortname}`] = {
                                value: intersectingZones[i].shortname
                            };
                        }
                    }
                }
                await setPreFilledResponse(refValue, preFilledResponses);

                // Increment counter and log progress every 5000 interviews
                processedCount++;
                if (processedCount % 5000 === 0) {
                    console.log(`Processed ${processedCount} prefilled data of ${dataCount}`);
                }
            });
        });

        await promiseQueue.onIdle();
    }
}

taskWrapper(new PreFilledResponses())
    .then(() => {
        // eslint-disable-next-line n/no-process-exit
        process.exit();
    })
    .catch((err) => {
        console.error('Error executing task', err);
        // eslint-disable-next-line n/no-process-exit
        process.exit();
    });
