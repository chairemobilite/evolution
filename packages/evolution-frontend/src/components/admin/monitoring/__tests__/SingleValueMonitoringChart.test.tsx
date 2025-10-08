/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SingleValueMonitoringChart } from '../SingleValueMonitoringChart';

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

describe('SingleValueMonitoringChart', () => {
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

    beforeEach(() => {
        mockFetch.mockClear();
    });

    const defaultProps = {
        apiUrl: 'http://example.com/api/data',
        valueName: 'testValue',
        valueTitle: 'Test Value Title',
        valueUnit: 'km'
    };

    it('fetches and displays value correctly when status is 200', async () => {
        mockFetch.mockResolvedValueOnce({
            status: 200,
            json: async () => ({ testValue: 42 })
        } as Response);

        render(<SingleValueMonitoringChart {...defaultProps} />);

        expect(screen.getByText('Test Value Title')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('42')).toBeInTheDocument();
        });
        expect(screen.getByText('km')).toBeInTheDocument();
    });

    it('displays error when value is not a number', async () => {
        mockFetch.mockResolvedValueOnce({
            status: 200,
            json: async () => ({ testValue: 'not a number' })
        } as Response);

        render(<SingleValueMonitoringChart {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('Invalid value type received from server.')).toBeInTheDocument();
        });
    });

    it('displays error when fetch fails', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        render(<SingleValueMonitoringChart {...defaultProps} />);

        await waitFor(() => {
            expect(screen.getByText('Error fetching data.')).toBeInTheDocument();
        });
    });

    it('displays decimal values correctly', async () => {
        mockFetch.mockResolvedValueOnce({
            status: 200,
            json: async () => ({ testValue: 42.756 })
        } as Response);

        render(<SingleValueMonitoringChart {...defaultProps} />);

        await waitFor(() => {
            // Should round to one decimal place
            expect(screen.getByText('42.8')).toBeInTheDocument();
        });
    });

    it('displays value without unit when not provided', async () => {
        const propsWithoutUnit = { ...defaultProps, valueUnit: undefined };
        mockFetch.mockResolvedValueOnce({
            status: 200,
            json: async () => ({ testValue: 100 })
        } as Response);

        render(<SingleValueMonitoringChart {...propsWithoutUnit} />);

        await waitFor(() => {
            expect(screen.getByText('100')).toBeInTheDocument();
        });
        expect(screen.queryByText('km')).not.toBeInTheDocument();
    });

    it('displays error when JSON parsing fails', async () => {
        mockFetch.mockResolvedValueOnce({
            status: 200,
            json: jest.fn().mockRejectedValueOnce(new Error('Invalid JSON'))
        } as unknown as Response);

        render(<SingleValueMonitoringChart {...defaultProps} />);

        expect(screen.getByText('Test Value Title')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('Error converting data to json.')).toBeInTheDocument();
        });
    });

    it('displays error when server returns 404 status', async () => {
        mockFetch.mockResolvedValueOnce({
            status: 404
        } as Response);

        render(<SingleValueMonitoringChart {...defaultProps} />);

        expect(screen.getByText('Test Value Title')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('Error fetching data.')).toBeInTheDocument();
        });
    });

    it('displays error when server returns 500 status', async () => {
        mockFetch.mockResolvedValueOnce({
            status: 500
        } as Response);

        render(<SingleValueMonitoringChart {...defaultProps} />);

        expect(screen.getByText('Test Value Title')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('Server error: Failed to fetch value.')).toBeInTheDocument();
        });
    });
});
