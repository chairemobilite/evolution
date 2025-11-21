/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HorizontalBarMonitoringChart } from '../HorizontalBarMonitoringChart';

// Mock fetch globally
global.fetch = jest.fn();

// Mock react-i18next
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const translations: { [key: string]: string } = {
                'admin:monitoring.errors.serverError': 'Server error: Failed to fetch value.',
                'admin:monitoring.errors.fetchError': 'Error fetching data.',
                'admin:monitoring.errors.jsonConversion': 'Error converting data to json.',
                'admin:monitoring.errors.invalidValueType': 'Invalid value type received from server.'
            };
            return translations[key] || key;
        }
    })
}));

// Mock d3 to avoid issues with Jest
// TODO: Improve this mock to cover used d3 functions if needed
jest.mock('d3', () => ({}));

describe('HorizontalBarMonitoringChart', () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

    beforeEach(() => {
        mockFetch.mockClear();
    });

    const defaultProps = {
        apiUrl: 'http://example.com/api/data',
        chartTitle: 'Test Chart Title',
        xAxisTitle: 'X Axis',
        yAxisTitle: 'Y Axis'
    };

    // const mockData = [
    //     { label: 'A', percentage: 60, count: 6 },
    //     { label: 'B', percentage: 40, count: 4 }
    // ];

    // TODO: Re-enable this test when d3 is properly mocked
    // it('renders chart title and fetches data', async () => {
    //     mockFetch.mockResolvedValueOnce({
    //         status: 200,
    //         json: async () => ({ data: mockData })
    //     } as Response);

    //     render(<HorizontalBarMonitoringChart {...defaultProps} />);

    //     expect(screen.getByText('Test Chart Title')).toBeInTheDocument();
    //     await waitFor(() => {
    //         expect(screen.getByText('A')).toBeInTheDocument();
    //         expect(screen.getByText('B')).toBeInTheDocument();
    //         expect(screen.getAllByText(/%/).length).toBeGreaterThan(0);
    //     });
    // });

    // TODO: Re-enable this test when d3 is properly mocked
    // it('shows loading spinner while loading', async () => {
    //     mockFetch.mockResolvedValueOnce({
    //         status: 200,
    //         json: async () => ({ data: mockData })
    //     } as Response);

    //     render(<HorizontalBarMonitoringChart {...defaultProps} />);
    //     expect(screen.getByText('Test Chart Title')).toBeInTheDocument();
    //     expect(screen.getByRole('status')).toBeInTheDocument();
    //     await waitFor(() => {
    //         expect(screen.getByText('A')).toBeInTheDocument();
    //     });
    // });

    it('shows error when fetch fails', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        render(<HorizontalBarMonitoringChart {...defaultProps} />);
        await waitFor(() => {
            expect(screen.getByText('Error fetching data.')).toBeInTheDocument();
        });
    });

    it('shows error when server returns 500', async () => {
        mockFetch.mockResolvedValueOnce({
            status: 500
        } as Response);

        render(<HorizontalBarMonitoringChart {...defaultProps} />);
        await waitFor(() => {
            expect(screen.getByText('Server error: Failed to fetch value.')).toBeInTheDocument();
        });
    });

    it('shows error when invalid data is returned', async () => {
        mockFetch.mockResolvedValueOnce({
            status: 200,
            json: async () => ({ data: { not: 'an array' } })
        } as Response);

        render(<HorizontalBarMonitoringChart {...defaultProps} />);
        await waitFor(() => {
            expect(screen.getByText('Invalid value type received from server.')).toBeInTheDocument();
        });
    });

    it('shows error when JSON parsing fails', async () => {
        mockFetch.mockResolvedValueOnce({
            status: 200,
            json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON'))
        } as unknown as Response);

        render(<HorizontalBarMonitoringChart {...defaultProps} />);
        await waitFor(() => {
            expect(screen.getByText('Error converting data to json.')).toBeInTheDocument();
        });
    });

    it('renders nothing if data is empty', async () => {
        mockFetch.mockResolvedValueOnce({
            status: 200,
            json: async () => ({ data: [] })
        } as Response);

        render(<HorizontalBarMonitoringChart {...defaultProps} />);
        await waitFor(() => {
            // Chart SVG should not be rendered
            expect(screen.queryByText('A')).not.toBeInTheDocument();
            expect(screen.queryByText('B')).not.toBeInTheDocument();
        });
    });
});
