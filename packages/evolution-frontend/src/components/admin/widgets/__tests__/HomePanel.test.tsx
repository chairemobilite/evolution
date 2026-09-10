/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HomePanel } from '../HomePanel';
import type { Home } from 'evolution-common/lib/services/baseObjects/Home';
import type { AuditForObject } from 'evolution-common/lib/services/audits/types';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, defaultValue?: string) => defaultValue ?? key
    })
}));

jest.mock('../../AuditDisplay', () => ({
    __esModule: true,
    default: ({ audits }: { audits?: AuditForObject[] }) => (
        <div data-testid="audit-display">{audits?.map((audit) => audit.message).join(' ')}</div>
    )
}));

jest.mock('../SurveyObjectBox', () => ({
    SurveyObjectBox: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

const homeUuid = '11111111-1111-4111-8111-111111111111';

const createHome = (overrides: Partial<Home> = {}): Home =>
    ({
        _uuid: homeUuid,
        address: { fullAddress: '123 Main St' },
        ...overrides
    }) as Home;

describe('HomePanel lastAction', () => {
    test.each(['preGeocoded', 'findPlace', 'mapClicked', 'markerDragged', 'geocoding', 'shortcut'])(
        'from geography (%s)',
        (lastAction) => {
            const home = createHome({
                geography: {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [0, 0] },
                    properties: { lastAction }
                }
            });

            render(<HomePanel home={home} />);

            expect(screen.getByText(/interviewStats.labels.lastAction/)).toBeInTheDocument();
            expect(screen.getByText(lastAction)).toBeInTheDocument();
        }
    );

    test('does not show lastAction when it is missing', () => {
        render(<HomePanel home={createHome()} />);

        expect(screen.queryByText(/interviewStats.labels.lastAction/)).not.toBeInTheDocument();
    });

    test('maps copy lastAction to the clonedFromUsualPlace label', () => {
        render(
            <HomePanel
                home={createHome({
                    geography: {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [0, 0] },
                        properties: { lastAction: 'copy' }
                    }
                })}
            />
        );

        expect(screen.getByText('clonedFromUsualPlace')).toBeInTheDocument();
    });

    test('shows an unknown lastAction as-is', () => {
        render(
            <HomePanel
                home={createHome({
                    geography: {
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [0, 0] },
                        properties: { lastAction: 'futureAction' }
                    }
                })}
            />
        );

        expect(screen.getByText('futureAction')).toBeInTheDocument();
    });
});
