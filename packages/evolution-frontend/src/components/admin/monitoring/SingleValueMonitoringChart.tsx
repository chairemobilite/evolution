/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import Loader from 'react-spinners/HashLoader';
import { useTranslation } from 'react-i18next';

type SingleValueMonitoringChartProps = {
    apiUrl: string; // API endpoint to fetch data from
    valueName: string; // Name of the value to display from the API JSON response
    valueTitle: string; // Title to display in the h3
    valueUnit?: string; // Optional unit to display after the value (e.g., km, min, %)
};

// Component to display a single value fetched from an API endpoint
export const SingleValueMonitoringChart: React.FC<SingleValueMonitoringChartProps> = ({
    apiUrl,
    valueName,
    valueTitle,
    valueUnit
}) => {
    const { t } = useTranslation();
    const [value, setValue] = React.useState<number | undefined>(undefined);
    const [errorKey, setErrorKey] = React.useState<string | null>(null); // Translation key for error message, if any
    const [loading, setLoading] = React.useState<boolean>(true);

    React.useEffect(() => {
        const abortController = new AbortController(); // Create an AbortController to manage fetch cancellation
        setLoading(true);
        setErrorKey(null);
        // Fetch the value from the provided API endpoint
        fetch(apiUrl, {
            method: 'POST',
            body: JSON.stringify({ refreshCache: false }),
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            signal: abortController.signal // Attach the signal to the fetch request
        })
            .then((response) => {
                if (response.status === 200) {
                    response
                        .json()
                        .then((jsonData) => {
                            // Extract the value using the provided valueName
                            const extractedValue = jsonData[valueName];
                            if (typeof extractedValue === 'number') {
                                setValue(extractedValue);
                            } else {
                                setErrorKey('admin:monitoring.errors.invalidValueType');
                                console.error(
                                    t('admin:monitoring.errors.invalidValueType'),
                                    'Expected number, got:',
                                    typeof extractedValue,
                                    extractedValue
                                );
                            }
                        })
                        .catch((err) => {
                            if (err.name !== 'AbortError') {
                                // Ignore abort errors
                                setErrorKey('admin:monitoring.errors.jsonConversion');
                                console.error(t('admin:monitoring.errors.jsonConversion'), err);
                            }
                        });
                } else if (response.status === 500) {
                    setErrorKey('admin:monitoring.errors.serverError');
                    console.error(t('admin:monitoring.errors.serverError'), response);
                } else {
                    setErrorKey('admin:monitoring.errors.fetchError');
                    console.error(t('admin:monitoring.errors.fetchError'), response);
                }
            })
            .catch((err) => {
                if (err.name !== 'AbortError') {
                    setErrorKey('admin:monitoring.errors.fetchError');
                    console.error(t('admin:monitoring.errors.fetchError'), err);
                }
            })
            .finally(() => {
                if (!abortController.signal.aborted) {
                    setLoading(false); // Ensure loading is set to false after fetch completes
                }
            });

        return () => abortController.abort(); // Cleanup function to abort fetch on unmount
    }, [apiUrl, valueName]);

    // Render the value in a styled container
    // Only show decimals if the value is not an integer, else show as integer.
    // This ensures clean display for both integer and decimal values.
    return (
        <section className="monitoring-single-value-container">
            <div>
                <h3>{valueTitle}</h3>
            </div>
            {errorKey ? (
                <div className="monitoring-error">{t(errorKey)}</div>
            ) : loading ? (
                <Loader size={'30px'} color={'#aaaaaa'} loading={true} />
            ) : (
                <div className="monitoring-big-number">
                    {value !== undefined ? (Number.isInteger(value) ? value : Number(value).toFixed(1)) : ''}
                    {valueUnit ? <span>{valueUnit}</span> : null}
                </div>
            )}
        </section>
    );
};
