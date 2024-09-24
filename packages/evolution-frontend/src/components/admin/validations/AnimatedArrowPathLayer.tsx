/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { PathLayer, PathLayerProps } from '@deck.gl/layers';
import { Accessor, DefaultProps } from '@deck.gl/core';
import { lineString as turfLineString, distance as turfDistance, length as turfLength } from '@turf/turf';

/*
This layer has a custom shader to show arrows on path so we can know the direction of travel.
This is temporary and animation is currently disabled. TODO: fix the distanceSoFar precision problem
and make the arrows more consistent and regular on path.
*/

export type AnimatedArrowPathLayerProps<DataT = any> = _AnimatedArrowPathLayerProps<DataT> & PathLayerProps<DataT>;

type _AnimatedArrowPathLayerProps<DataT = unknown> = {
    /**
     * [solid length, gap length] accessor.
     * @default 8
     */
    getDistanceBetweenArrows?: Accessor<DataT, number>;

    /**
     * Current time for the animation.
     * @default 0
     */
    currentTime?: number;

    /**
     * Arrow path speed scaling. The larger the number, the slower the path movement. 0 prevents movement
     * @default 1
     */
    speedDivider?: number;

    /**
     * Set to `true` to disable animation
     */
    disableAnimation?: boolean;

    /**
     * zoom level from view state
     */
    zoom?: number;
};

const defaultProps: DefaultProps<AnimatedArrowPathLayerProps> = {
    speedDivider: 1,
    disableAnimation: false,
    zoom: 13
};

export class AnimatedArrowPathLayer<DataT = any, ExtraProps extends object = never> extends PathLayer<
    DataT,
    Required<_AnimatedArrowPathLayerProps> & ExtraProps
> {
    static layerName = 'AnimatedArrowPathLayer';
    static defaultProps = defaultProps;

    state!: {
        animationID: number;
        time: number;
        pathTesselator: any; // From PathLayer
    };

    constructor(props: any) {
        super(props);
    }

    initializeState() {
        super.initializeState();

        const attributeManager = this.getAttributeManager();
        attributeManager?.addInstanced({
            instanceTotalLengthM: {
                size: 1,
                accessor: 'getPath',
                transform: this.getTotalLengthM
            },
            instancePercentSoFar: {
                size: 1,
                accessor: 'getPath',
                transform: this.getPercentsSoFar
            },
            instancePercentSoFarNext: {
                // TODO: use an array and set instancePercentSoFarWithNext in the same array of two values, for better performance
                size: 1,
                accessor: 'getPath',
                transform: this.getPercentsSoFarNext
            }
        });
    }

    draw(opts) {
        opts.uniforms.speedDivider = this.props.speedDivider;
        opts.uniforms.zoom = this.props.zoom;
        opts.uniforms.currentTime = this.props.currentTime;
        opts.uniforms.disableAnimation = this.props.disableAnimation;
        super.draw(opts);
    }

    getTotalLengthM = (path): number[] => {
        const totalLengthM = turfLength(turfLineString(path), { units: 'meters' });
        const lengths: number[] = [];
        for (let i = 0, count = path.length; i < count; i++) {
            lengths.push(totalLengthM);
        }
        return lengths;
    };

    getPercentsSoFar = (path): number[] => {
        const result = [0] as number[];
        if (path === undefined || path.length < 2) {
            return result;
        }
        const positionSize = this.props.positionFormat === 'XY' ? 2 : 3;
        const isNested = Array.isArray(path[0]);
        const geometrySize = isNested ? path.length : path.length / positionSize;
        let sumLength = 0;
        let p;
        let prevP;
        for (let i = 0; i < geometrySize; i++) {
            p = isNested ? path[i] : path.slice(i * positionSize, i * positionSize + positionSize);
            p = this.projectPosition(p);
            if (i > 0) {
                //const distance = vec3.dist(prevP, p);
                const distanceMeters = turfDistance(prevP, p, { units: 'meters' });
                if (i < geometrySize - 1) {
                    result[i] = result[i - 1] + distanceMeters;
                }
                sumLength += distanceMeters;
            }
            prevP = p;
        }
        for (let i = 0, count = result.length; i < count; i++) {
            result[i] = result[i] / sumLength;
        }
        return result;
    };

    getPercentsSoFarNext = (path): number[] => {
        const result = [0] as number[];
        if (path === undefined || path.length < 2) {
            return result;
        }
        const positionSize = this.props.positionFormat === 'XY' ? 2 : 3;
        const isNested = Array.isArray(path[0]);
        const geometrySize = isNested ? path.length : path.length / positionSize;
        let sumLength = 0;
        let p;
        let prevP;
        for (let i = 0; i < geometrySize; i++) {
            p = isNested ? path[i] : path.slice(i * positionSize, i * positionSize + positionSize);
            p = this.projectPosition(p);
            if (i > 0) {
                const distanceMeters = turfDistance(prevP, p, { units: 'meters' });
                if (i < geometrySize - 1) {
                    result[i] = result[i - 1] + distanceMeters;
                }
                sumLength += distanceMeters;
            }
            prevP = p;
        }
        for (let i = 0, count = result.length - 1; i < count; i++) {
            result[i] = result[i + 1] / sumLength;
        }
        result[result.length - 1] = 1.0;
        return result;
    };

    getLengthsM = (path): number[] => {
        const result = [] as number[];
        if (path === undefined || path.length < 2) {
            return result;
        }
        const positionSize = this.props.positionFormat === 'XY' ? 2 : 3;
        const isNested = Array.isArray(path[0]);
        const geometrySize = isNested ? path.length : path.length / positionSize;
        let p;
        let prevP = this.projectPosition(isNested ? path[0] : path.slice(0, positionSize));
        for (let i = 1; i < geometrySize; i++) {
            p = isNested ? path[i] : path.slice(i * positionSize, i * positionSize + positionSize);
            p = this.projectPosition(p);
            const distanceMeters = turfDistance(prevP, p, { units: 'meters' });
            result[i - 1] = distanceMeters;
            prevP = p;
        }
        return result;
    };

    getShaders() {
        return Object.assign({}, super.getShaders(), {
            inject: {
                'vs:#decl': `

                in float instanceTotalLengthM;
                in float instancePercentSoFar;
                in float instancePercentSoFarNext;
                out float vPercentSoFar;
                out float vPercentSoFarNext;
                out float vTotalLengthM;
                out float vZoom;
                out float vCurrentTime;
                uniform float currentTime;
                uniform float speedDivider;
                uniform float zoom;
                uniform bool disableAnimation;
          `,

                'vs:#main-end': `

                vTotalLengthM = instanceTotalLengthM;
                vPercentSoFar = instancePercentSoFar;
                vPercentSoFarNext = instancePercentSoFarNext;
                vZoom = zoom;
                vCurrentTime = disableAnimation ? 0.0 : currentTime;
                float vSpeedDivider = speedDivider;
                if (!disableAnimation && vSpeedDivider != 0.0) {
                  vCurrentTime = vCurrentTime / vSpeedDivider;
                }
          `,

                'fs:#decl': `

                in float vTotalLengthM;
                in float vPercentSoFar;
                in float vPercentSoFarNext;
                in float vCurrentTime;
                in float vZoom;
          `,
                'fs:#main-start': `

          `,
                'fs:#main-end': `

                float percentFromCenter = abs(vPathPosition.x);
                float distanceMSoFarAtSegmentStart = vTotalLengthM * vPercentSoFar;
                float distanceMSoFarAtSegmentEnd = vTotalLengthM * vPercentSoFarNext;
                float percentSoFarOnSegment = (vPathPosition.y) / vPathLength;
                float vPathLengthTruncated = vPathLength;
                float distanceMSoFar = distanceMSoFarAtSegmentStart + percentSoFarOnSegment * (distanceMSoFarAtSegmentEnd - distanceMSoFarAtSegmentStart);
                float arrowDistanceRatio = 3000.0;

                // TODO: would need a better function to interpolate between zooms and arrow distance ratios:

                if (vZoom >= 10.0 && vZoom < 11.0) {
                    arrowDistanceRatio = 2500.0;
                } else if (vZoom >= 11.0 && vZoom < 12.0) {
                    arrowDistanceRatio = 1000.0;
                } else if (vZoom >= 12.0 && vZoom < 13.0) {
                    arrowDistanceRatio = 500.0;
                } else if (vZoom >= 13.0 && vZoom < 14.0) {
                    arrowDistanceRatio = 200.0;
                } else if (vZoom >= 14.0 && vZoom < 15.0) {
                    arrowDistanceRatio = 90.0;
                } else if (vZoom >= 15.0 && vZoom < 16.0) {
                    arrowDistanceRatio = 70.0;
                } else if (vZoom >= 16.0 && vZoom < 17.0) {
                    arrowDistanceRatio = 40.0;
                } else if (vZoom >= 17.0 && vZoom < 18.0) {
                    arrowDistanceRatio = 20.0;
                } else if (vZoom >= 18.0) {
                    arrowDistanceRatio = 7.0;
                }
                
                float percentArrowDistance = mod(distanceMSoFar - vCurrentTime * arrowDistanceRatio + arrowDistanceRatio * percentFromCenter / 5.0, arrowDistanceRatio) / (arrowDistanceRatio);

                if (percentArrowDistance < 0.05) {
                    if (percentFromCenter > 0.5) {
                        fragColor = vec4(1.0, 1.0, 1.0, 1.0 - percentFromCenter * 1.2);
                    } else {
                        fragColor = vec4(1.0, 1.0, 1.0, 1.0);
                    }
                } else if (percentFromCenter > 0.5) {
                    fragColor = vec4(0.0, 0.0, 0.0, 1.0 - percentFromCenter * 1.2);
                } else if (percentFromCenter > 0.35) {
                    fragColor = vec4(1.0, 1.0, 1.0, 1.0);
                } else {
                    float percentBlack = percentArrowDistance * 0.5;
                    fragColor = vec4(mix(vColor.r, 0.0, percentBlack), mix(vColor.g, 0.0, percentBlack), mix(vColor.b, 0.0, percentBlack), 1.0);
                }

                // See this link for info about vPathPosition variable
                // https://github.com/visgl/deck.gl/blob/b7c9fcc2b6e8693b5574a498fd128919b9780b49/modules/layers/src/path-layer/path-layer-fragment.glsl.ts#L31-L35

          `
            }
        });
    }
}
