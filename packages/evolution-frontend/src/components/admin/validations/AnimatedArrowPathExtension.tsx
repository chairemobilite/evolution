/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { DefaultProps, Layer, LayerContext, LayerExtension } from '@deck.gl/core';
import type { ShaderModule } from '@luma.gl/shadertools';
import { vec3 } from 'gl-matrix';

const uniformBlock = `\
uniform animatedArrowPathUniforms {
  float time;
  float arrowSpacing;
} animatedArrowPath;
`;

type AnimatedArrowPathProps = {
    time: number;
    arrowSpacing: number;
};

const defaultProps: DefaultProps<_AnimatedArrowPathLayerProps> = {
    time: { type: 'number', value: 0, min: 0, max: 1 },
    disableAnimation: { type: 'boolean', value: false }
};

type _AnimatedArrowPathLayerProps = {
    time: number;
    arrowSpacing: number;
    /**
     * Set to `true` to disable animation
     */
    disableAnimation: boolean;
};

export default class AnimatedArrowPathExtension extends LayerExtension {
    static extensionName = 'AnimatedArrowPathExtension';
    static layerName = 'AnimatedArrowPathLayer';
    static defaultProps = defaultProps;

    initializeState(this: Layer<_AnimatedArrowPathLayerProps>, context: LayerContext, extension: this) {
        this.getAttributeManager()?.addInstanced({
            instanceStartOffsetRatios: {
                size: 1,
                accessor: 'getPath',
                transform: extension.getStartOffsetRatios.bind(this)
            },
            instanceLengthRatios: {
                size: 1,
                accessor: 'getPath',
                transform: extension.getLengthRatios.bind(this)
            }
        });
    }

    onHover(this: Layer<_AnimatedArrowPathLayerProps>, _info: any, _pickingEvent: any) {
        // Enable proper picking for click events
        return true;
    }

    getStartOffsetRatios(this: Layer<_AnimatedArrowPathLayerProps>, path): number[] {
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
                const distance = vec3.dist(prevP, p);
                if (i < geometrySize - 1) {
                    result[i] = result[i - 1] + distance;
                }
                sumLength += distance;
            }
            prevP = p;
        }
        for (let i = 0, count = result.length; i < count; i++) {
            result[i] = result[i] / sumLength;
        }
        return result;
    }

    getLengthRatios(this: Layer<AnimatedArrowPathProps>, path): number[] {
        const result = [] as number[];
        if (path === undefined || path.length < 2) {
            return result;
        }
        const positionSize = this.props.positionFormat === 'XY' ? 2 : 3;
        const isNested = Array.isArray(path[0]);
        const geometrySize = isNested ? path.length : path.length / positionSize;
        let sumLength = 0;
        let p;
        let prevP = this.projectPosition(isNested ? path[0] : path.slice(0, positionSize));
        for (let i = 1; i < geometrySize; i++) {
            p = isNested ? path[i] : path.slice(i * positionSize, i * positionSize + positionSize);
            p = this.projectPosition(p);
            const distance = vec3.dist(prevP, p);
            sumLength += distance;
            result[i - 1] = distance;
            prevP = p;
        }
        for (let i = 0, count = result.length; i < count; i++) {
            result[i] = result[i] / sumLength;
        }
        result.push(result[0]); // add last point again to make sure closed paths are handled
        return result;
    }

    draw(this: Layer<_AnimatedArrowPathLayerProps>, _params: any, _extension: this) {
        const zoom = this.context.viewport?.zoom || 14;

        let zoomFactor;
        if (zoom <= 14) {
            zoomFactor = 1.0;
        } else {
            // This function gives the best approximation of a stable speed
            zoomFactor = 0.0007 * Math.pow(zoom - 8, 4.5);
        }
        // Calculate animation time with seamless reset
        // Use a cycle that matches the arrow spacing
        // This ensures the reset happens when arrows are at a natural transition point
        const arrowSpacing = 30.0; // Configurable arrow spacing (f32)
        const cycleDuration = 3000000; // 30 seconds. Increase for slower, decrease for faster.
        const rawTime = performance.now() % cycleDuration;
        const normalizedTime = rawTime / cycleDuration;

        // Scale the time to match the arrow pattern
        // This ensures smooth transitions when the cycle resets
        const seamlessTime = this.props.disableAnimation ? 1 : normalizedTime * arrowSpacing;
        const animatedArrowProps: AnimatedArrowPathProps = {
            time: seamlessTime / zoomFactor,
            arrowSpacing: arrowSpacing
        };
        (this.state.model as any)?.shaderInputs.setProps({ animatedArrowPath: animatedArrowProps });
    }

    // See https://deck.gl/docs/developer-guide/custom-layers/picking for more information about picking colors
    getShaders(this: Layer<_AnimatedArrowPathLayerProps>) {
        const inject = {
            'vs:#decl': `
                in float instanceLengthRatios;
                in float instanceStartOffsetRatios;
                out float vLengthRatio;
                out float vStartOffsetRatio;
                out float vArrowPathOffset;
            `,

            'vs:#main-end': `
                vLengthRatio = instanceLengthRatios;
                vStartOffsetRatio = instanceStartOffsetRatios;
                vArrowPathOffset += animatedArrowPath.time / width.x;
            `,

            'fs:#decl': `
                in float vArrowPathOffset;
                in float vDistanceBetweenArrows;
                in float vStartOffsetRatio;
                in float vLengthRatio;
            `,

            'fs:#main-end': `
                float percentFromCenter = abs(vPathPosition.x);
                float offset = vArrowPathOffset;
                float totalLength = vPathLength / vLengthRatio;
                float startDistance = vStartOffsetRatio * totalLength;
                float distanceSoFar = startDistance + vPathPosition.y - offset + percentFromCenter;
                float arrowIndex = mod(distanceSoFar, animatedArrowPath.arrowSpacing);
                float percentOfDistanceBetweenArrows = 1.0 - arrowIndex / animatedArrowPath.arrowSpacing;
                
                // Create white border effect on the edges
                float borderWidth = 0.3; // Adjust this value to control border thickness
                float borderFactor = smoothstep(1.0 - borderWidth, 1.0, percentFromCenter);
                
                vec3 finalColor;
                if (percentOfDistanceBetweenArrows < 0.5) {
                    float percentBlack = percentOfDistanceBetweenArrows / 0.5 * 0.5;
                    finalColor = mix(vColor.rgb, vec3(0.0), percentBlack);
                } else if (percentOfDistanceBetweenArrows < 0.75) {
                    float percentWhite = (1.0 - (percentOfDistanceBetweenArrows - 0.5) * 4.0) * 0.75;
                    finalColor = mix(vColor.rgb, vec3(1.0), percentWhite);
                } else {
                    finalColor = vColor.rgb;
                }
                
                // Apply white border with antialiasing
                finalColor = mix(finalColor, vec3(1.0), borderFactor);
                
                // CRITICAL: Apply deck.gl picking color filtering
                // This ensures that clicking works properly by allowing deck.gl to render picking colors
                // when in picking mode, and our custom colors when in normal rendering mode
                fragColor = picking_filterPickingColor(vec4(finalColor, 1.0));
            `
        };
        return {
            modules: [
                {
                    name: 'animatedArrowPath',
                    vs: uniformBlock,
                    fs: uniformBlock,
                    uniformTypes: {
                        time: 'f32',
                        arrowSpacing: 'f32'
                    },
                    inject
                } as ShaderModule<any>
            ]
        };
    }
}
