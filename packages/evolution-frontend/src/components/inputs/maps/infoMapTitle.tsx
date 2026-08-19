/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';

/**
 * Title above an `infoMap`. The survey generator turns `**bold**` / `__hint__`
 * into HTML (`<strong>`, `<span class="_pale _oblique">`, `style="..."`).
 * Markdown would show those tags as text, so HTML titles use the same path as
 * the Text widget (`containsHtml`).
 * @param title Translated title string
 * @param containsHtml When true, render as HTML; otherwise Markdown
 */
export const InfoMapTitle: React.FC<{ title: string; containsHtml?: boolean }> = ({ title, containsHtml }) => (
    <div className="infoMap-title">
        {containsHtml ? (
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(title) }} />
        ) : (
            <Markdown remarkPlugins={[[remarkGfm, { singleTilde: false }]]}>{title}</Markdown>
        )}
    </div>
);
