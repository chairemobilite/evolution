/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { InfoMapTitle } from '../infoMapTitle';

// react-markdown is ESM; Jest cannot load it. The mock still applies GFM bold so
// the Markdown branch can assert a <strong> instead of literal **text**.
jest.mock('react-markdown', () => {
    const React = require('react');
    return {
        __esModule: true,
        default: ({ children }: { children: string }) => {
            const bold = String(children).match(/^\*\*(.+)\*\*$/);
            return bold ? React.createElement('strong', null, bold[1]) : children;
        }
    };
});
jest.mock('remark-gfm', () => () => undefined);

test('containsHtml renders generator style tags instead of showing them as text', () => {
    const { container } = render(
        <InfoMapTitle
            title='Carte <span class="_pale _oblique">de vos déplacements</span>'
            containsHtml={true}
        />
    );
    expect(container.querySelector('span._pale._oblique')).toHaveTextContent('de vos déplacements');
    expect(screen.queryByText(/<span/)).not.toBeInTheDocument();
});

test('containsHtml still renders a plain title', () => {
    render(<InfoMapTitle title="Carte de vos déplacements" containsHtml={true} />);
    expect(screen.getByText('Carte de vos déplacements')).toBeInTheDocument();
});

test('without containsHtml renders GFM titles', () => {
    render(<InfoMapTitle title="**bold**" />);
    expect(screen.getByText('bold').tagName).toBe('STRONG');
    expect(screen.queryByText('**bold**')).not.toBeInTheDocument();
});
