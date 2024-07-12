/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import * as SAttr from '../baseObjects/attributeTypes/SegmentAttributes';

/**
 * Configuration for the segment section
 */
export type SegmentSectionConfig = {
    /**
     * Configure which modes should be presented or not for the segment. By
     * default, all available modes in {@link SAttr.Mode} will be presented.
     */
    modes?: {
        /**
         * If set, only the modes in this list will be presented
         */
        include?: SAttr.Mode[],
        /**
         * If set, the modes in this list will not be presented
         */
        exclude?: SAttr.Mode[]
    },
    /**
     * Add extra personalized configuration for each mode. This does not have to
     * exhaustively list all the modes. The default values for each mode not
     * specified will be used.
     */
    modeConfigs?: {
        [mode in SAttr.Mode]?: {
            /**
             * Specify the zone where this mode should be asked. If the origin
             * or destination is within this zone, or if a straight line between
             * origin and destination crosses this zone, the mode will be
             * presented. If not set, the mode will be presented everywhere.
             */
            onlyInZone?: GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>
            /**
             * If set to true, the mode will only be shown if the participant
             * has a driving license.
             *
             * FIXME: Should this also automatically add the question about the
             * driving license in the household members section?
             */
            needsDrivingLicense?: boolean
            /**
             * If set to true, the mode will only be shown if the participant
             * has a membership to a specific service.  
             *
             * FIXME: Should this also automatically add a question about the
             * membership (or usage of the service) in the household members
             * section? Or should `membership` be understand as "has used the
             * service" or should that be another question? (like for transit)
             */
            needsMembership?: boolean
            // TODO Add other configurations like stations, or private/public, public/private junctions, etc
        }
    }
}
