/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import React, { useEffect, useRef, useState } from 'react';
import { create, scaleLinear, scaleBand, axisTop, axisLeft, max, select } from 'd3';
import Loader from 'react-spinners/HashLoader';
import { useTranslation } from 'react-i18next';

export type Value = {
    label: string; // Name/category for the Y axis
    percentage: number; // Always a percentage (0-100)
    count?: number; // Optional: raw count for tooltip
};

// New props interface
export type HorizontalBarMonitoringChartProps = {
    apiUrl: string; // API endpoint to fetch data from
    chartTitle: string;
    xAxisTitle: string;
    yAxisTitle: string;
};

// Component to display a horizontal bar chart using D3.js
export const HorizontalBarMonitoringChart: React.FC<HorizontalBarMonitoringChartProps> = ({
    apiUrl,
    chartTitle,
    xAxisTitle,
    yAxisTitle
}) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; value: string } | null>(null);
    const [data, setData] = useState<Value[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [errorKey, setErrorKey] = useState<string | null>(null);
    const { t } = useTranslation();

    // Fetch data from API
    useEffect(() => {
        const abortController = new AbortController();
        setLoading(true);
        setErrorKey(null);
        fetch(apiUrl, {
            method: 'POST',
            body: JSON.stringify({ refreshCache: false }),
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            signal: abortController.signal
        })
            .then((response) => {
                if (response.status === 200) {
                    response
                        .json()
                        .then((jsonData) => {
                            // Accepts either { data: Value[] } or just Value[]
                            if (Array.isArray(jsonData)) {
                                setData(jsonData);
                            } else if (Array.isArray(jsonData.data)) {
                                setData(jsonData.data);
                            } else {
                                setErrorKey('admin:monitoring.errors.invalidValueType');
                            }
                        })
                        .catch((err) => {
                            if (err.name !== 'AbortError') {
                                setErrorKey('admin:monitoring.errors.jsonConversion');
                            }
                        });
                } else if (response.status === 500) {
                    setErrorKey('admin:monitoring.errors.serverError');
                } else {
                    setErrorKey('admin:monitoring.errors.fetchError');
                }
            })
            .catch((err) => {
                if (err.name !== 'AbortError') {
                    setErrorKey('admin:monitoring.errors.fetchError');
                }
            })
            .finally(() => {
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            });
        return () => abortController.abort();
    }, [apiUrl]);

    useEffect(() => {
        if (!data || !Array.isArray(data) || data.length === 0) {
            if (chartRef.current) chartRef.current.innerHTML = '';
            return;
        }
        // Clear previous chart
        if (chartRef.current) {
            chartRef.current.innerHTML = '';
        }

        // Chart dimensions and margins
        const barHeight = 25;
        const marginTop = 90; // More space for both titles
        const marginRight = 0;
        const marginBottom = 0;
        const marginLeft = 90;
        const width = 540;
        const tickDistance = 60;
        const height = Math.ceil((data.length + 0.1) * barHeight) + marginTop + marginBottom;

        // Scales x and y (use percentage for x)
        const x = scaleLinear()
            .domain([0, max(data, (d) => d.percentage) || 1])
            .range([marginLeft, width - marginRight]);
        const y = scaleBand<string>()
            .domain(data.map((d) => d.label))
            .rangeRound([marginTop, height - marginBottom])
            .padding(0.25);

        // SVG container
        const svg = create('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', [0, 0, width, height])
            .attr('style', 'max-width: 100%; height: auto; font: 10px Gill Sans, Helvetica, Arial, sans-serif;');

        // Chart Title (left aligned, at the very top)
        svg.append('text')
            .attr('x', 0)
            .attr('y', 20)
            .attr('text-anchor', 'start')
            .attr('font-size', 22)
            .attr('font-weight', 'bold')
            .attr('fill', '#222')
            .text(chartTitle);

        // X axis title (centered, just above the x axis values, but below the chart title)
        svg.append('text')
            .attr('x', marginLeft + (width - marginLeft - marginRight) / 2)
            .attr('y', 60)
            .attr('text-anchor', 'middle')
            .attr('font-size', 20)
            .attr('font-weight', 'bold')
            .attr('fill', '#444')
            .text(xAxisTitle);

        // X axis (top) with % unit
        svg.append('g')
            .attr('transform', `translate(0,${marginTop})`)
            .call(
                axisTop(x)
                    .ticks(width / tickDistance)
                    .tickFormat((d) => `${d}%`)
                    .tickSize(0)
            )
            .call((g) => g.select('.domain').remove());

        // Y axis (left)
        svg.append('g')
            .attr('transform', `translate(${marginLeft},0)`)
            .call(
                axisLeft(y)
                    .tickSize(0)
                    .tickFormat((d) => d)
            )
            .call((g) => g.select('.domain').remove());

        // Y axis title (vertically centered, left of y axis)
        svg.append('text')
            .attr('x', 20)
            .attr('y', marginTop + (height - marginTop - marginBottom) / 2)
            .attr('text-anchor', 'middle')
            .attr('font-size', 20)
            .attr('fill', '#444')
            .attr('font-weight', 'bold')
            .attr('transform', `rotate(-90, 20, ${marginTop + (height - marginTop - marginBottom) / 2})`)
            .text(yAxisTitle);

        // Bars with hover effect (no vertical shift)
        svg.append('g')
            .attr('fill', '#6486bd')
            .selectAll('rect')
            .data(data)
            .join('rect')
            .attr('x', x(0))
            .attr('y', (d) => y(d.label)!)
            .attr('width', (d) => x(d.percentage) - x(0))
            .attr('height', y.bandwidth())
            .on('mouseenter', function (this: SVGRectElement, event, d) {
                select(this).classed('bar-hovered', true);
                setTooltip({
                    x: x(d.percentage) + 10,
                    y: y(d.label)! + y.bandwidth() / 2,
                    value: `${d.label}: ${d.percentage}%${d.count !== null ? ` (${d.count})` : ''}`
                });
            })
            .on('mouseleave', function (this: SVGRectElement) {
                select(this).classed('bar-hovered', false);
                setTooltip(null);
            });

        // Labels inside bars (show percentage, right aligned)
        svg.append('g')
            .attr('fill', 'white')
            .attr('text-anchor', 'end')
            .selectAll('text')
            .data(data)
            .join('text')
            .attr('x', (d) => x(d.percentage))
            .attr('y', (d) => y(d.label)! + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .attr('dx', -4)
            .text((d) => `${d.percentage}%`)
            .on('mouseenter', function (this: SVGTextElement, event, d) {
                // Find the corresponding bar and set its hover class
                select(this.parentNode as SVGGElement)
                    .select('rect')
                    .classed('bar-hovered', true);
                setTooltip({
                    x: x(d.percentage) + 10,
                    y: y(d.label)! + y.bandwidth() / 2,
                    value: `${d.label}: ${d.percentage}%${d.count !== null ? ` (${d.count})` : ''}`
                });
            })
            .on('mouseleave', function (this: SVGTextElement) {
                // Find the corresponding bar and remove its hover class
                select(this.parentNode as SVGGElement)
                    .select('rect')
                    .classed('bar-hovered', false);
                setTooltip(null);
            })
            .style('cursor', 'pointer')
            .call((text) =>
                text
                    .filter((d) => x(d.percentage) - x(0) < 20)
                    .attr('dx', +4)
                    .attr('fill', 'black')
                    .attr('text-anchor', 'start')
            );

        // Draw vertical lines up to the end of each bar, at each tick value <= bar value
        const xTicks = x.ticks(width / tickDistance);
        svg.append('g')
            .selectAll('g')
            .data(data)
            .join('g')
            .each(function (this: SVGGElement, d) {
                const barY = y(d.label)!;
                const barHeight = y.bandwidth();
                xTicks.forEach((tick) => {
                    if (tick > d.percentage) return;
                    select(this)
                        .append('line')
                        .attr('x1', x(tick))
                        .attr('x2', x(tick))
                        .attr('y1', barY)
                        .attr('y2', barY + barHeight)
                        .attr('stroke', '#ccc')
                        .attr('stroke-width', 1);
                });
            });

        // Tooltip
        if (chartRef.current) {
            chartRef.current.innerHTML = '';
            chartRef.current.appendChild(svg.node()!);
        }
    }, [chartTitle, xAxisTitle, yAxisTitle, data]);

    // Render
    return (
        <div
            style={{
                position: 'relative',
                background: 'white',
                padding: 16,
                boxSizing: 'border-box',
                borderRadius: 20,
                fontFamily: '"Gill Sans", "Gill Sans MT", Calibri, "Trebuchet MS", Helvetica, Arial, sans-serif',
                color: '#222'
            }}
        >
            {errorKey ? (
                <div className="monitoring-error">
                    <h3>{chartTitle}</h3>
                    {t(errorKey)}
                </div>
            ) : loading ? (
                <div className="monitoring-error">
                    <h3>{chartTitle}</h3>
                    <Loader size={'30px'} color={'#aaaaaa'} loading={true} />
                </div>
            ) : (
                <div ref={chartRef} />
            )}
            {tooltip && (
                <div
                    style={{
                        position: 'absolute',
                        left: Math.min(tooltip.x, 1150),
                        top: tooltip.y,
                        background: 'rgba(0,0,0,0.8)',
                        color: '#fff',
                        padding: '2px 6px',
                        borderRadius: 2,
                        border: '1px solid #222',
                        pointerEvents: 'none',
                        fontSize: 13,
                        zIndex: 10,
                        maxWidth: 300,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        transform: tooltip.x > 900 ? 'translateX(-100%)' : undefined,
                        fontFamily: '"Gill Sans", "Gill Sans MT", Calibri, "Trebuchet MS", Helvetica, Arial, sans-serif'
                    }}
                >
                    {tooltip.value}
                </div>
            )}
            <style>{`
                .bar-hovered {
                    fill: #b07d2c !important;
                    cursor: pointer;
                }
                svg {
                    background: white;
                    font-family: "Gill Sans", "Gill Sans MT", Calibri, "Trebuchet MS", Helvetica, Arial, sans-serif;
                }
                .tick text, .monitoring-big-number, h3 {
                    font-family: "Gill Sans", "Gill Sans MT", Calibri, "Trebuchet MS", Helvetica, Arial, sans-serif;
                }
                .tick line, .domain {
                    display: none;
                }
                .monitoring-big-number {
                    font-size: 2.5em;
                    color: #222;
                }
                .monitoring-error {
                    color: #b00;
                    font-size: 1em;
                }
                rect.bar-hovered {
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
};
