/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React                                                from 'react';
import { withTranslation }                                  from 'react-i18next';
import { Map, Marker, GoogleApiWrapper, Polyline, Polygon } from 'google-maps-react';
import { point as turfPoint }                               from '@turf/turf';
import Markdown                                             from 'react-markdown';
import _get                                                 from 'lodash.get';

import googleConfig from 'evolution-frontend/lib/config/googleMaps.config';
import * as surveyHelper from 'evolution-frontend/lib/utils/helpers';
import InputLoading from 'evolution-frontend/lib/components/inputs/InputLoading';

export class InfoMap extends React.Component {
  constructor(props) {
    super(props);
    
    // get initial map center from widget config (can be a function)
    let defaultCenter = null;
    if (props.value)
    {
      const coordinates = _get(props.value, 'geometry.coordinates', null);
      if (coordinates)
      {
        defaultCenter = new props.google.maps.LatLng(coordinates[1], coordinates[0]);
      }
    }
    else
    {
      const configDefaultCenter = surveyHelper.parseString(props.widgetConfig.defaultCenter, props.interview, props.path, props.user);
      defaultCenter = new props.google.maps.LatLng(configDefaultCenter.lat, configDefaultCenter.lon);
    }

    this.state = {
      center: defaultCenter
    }
    
    this.bounds         = null;
    this.map            = null;
    this.onMapReady     = this.onMapReady.bind(this);

  }

  markers()
  {

  }

  polylines()
  {

  }

  polygons()
  {

  }

  onMapReady(props, map)
  {
    if (this.bounds)
    {
      map.fitBounds(this.bounds);
    }
    else
    {
      map.panTo(this.state.center);
    }
    this.map = map;
  }

  geojson(latLng)
  {
    return (latLng && latLng.lat() && latLng.lng()) ? turfPoint([latLng.lng(), latLng.lat()]) : null;
  }

  render() {

    if(!this.props.widgetStatus.isVisible)
    {
      return null;
    }

    if (!this.props.loaded) {
      return <InputLoading />;
    }

    this.bounds            = new this.props.google.maps.LatLngBounds();
    const title            = surveyHelper.parseString(this.props.widgetConfig.title[this.props.i18n.language] || this.props.widgetConfig.title, this.props.interview, this.props.path, this.props.user);
    const geojsons         = this.props.widgetConfig.geojsons(this.props.interview, this.props.path, this.props.activeUuid);
    const gMarkers         = [];
    const gPolylines       = [];
    const gPolygons        = [];
    const points           = _get(geojsons, 'points.features', []);
    const linestrings      = _get(geojsons, 'linestrings.features', []);
    const polygons         = _get(geojsons, 'polygons.features', []);

    const linestringColor       = this.props.widgetConfig.linestringColor       || '#0000ff';
    const linestringActiveColor = this.props.widgetConfig.linestringActiveColor || '#00ff00';

    // prepare markers:
    for (let i = 0, countI = points.length; i < countI; i++)
    {
      const point   = points[i];
      const gLatLng = new this.props.google.maps.LatLng(point.geometry.coordinates[1], point.geometry.coordinates[0]);
      const markerParams = {
        key: `gMarker_infoMap_${this.props.path}__${i}`,
        position: gLatLng,
        draggable: false
      };
      if (point.properties.icon)
      {
        markerParams.icon = point.properties.icon;
      }
      gMarkers.push(<Marker {...markerParams} />);
      this.bounds.extend({lat: gLatLng.lat(), lng: gLatLng.lng()});
    }

    // prepare polylines:
    for (let i = 0, countI = linestrings.length; i < countI; i++)
    {
      const linestring          = linestrings[i];
      const polylineCoordinates = linestring.geometry.coordinates.map((coordinates) => ({lat: coordinates[1], lng: coordinates[0]}));
      
      const gArrowWhite = {
        path         : this.props.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        strokeColor  : "#ffffff",
        strokeOpacity: 0.8,
        strokeWeight : 5,
        scale        : 2,
        fillColor    : "#ffffff",
        fillOpacity  : 0.8
      };

      const gArrowBlack = {
        path         : this.props.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        strokeColor  : "#000000",
        strokeOpacity: 0.4,
        strokeWeight : 7,
        scale        : 2,
        fillColor    : "#000000",
        fillOpacity  : 0.4
      };

      const gArrow = {
        path         : this.props.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        strokeColor  : (linestring.properties && linestring.properties.active ? linestringActiveColor : linestringColor),
        strokeOpacity: 0.6,
        strokeWeight : 3,
        scale        : 2,
        fillColor    : (linestring.properties && linestring.properties.active ? linestringActiveColor : linestringColor),
        fillOpacity  : 0.6
      };

      gPolylines.push(<Polyline 
        key           = {`gPolyline_infoMap_black_${this.props.path}__${i}`}
        path          = {polylineCoordinates}
        strokeColor   = "#000000"
        strokeWeight  = {7}
        strokeOpacity = {0.4}
        icons         = {[{
          icon  : gArrowBlack,
          offset: '50%'
        }]}
        zIndex = {300 || Math.ceil((1000.0 / i)*1000.0)}
      />);

      gPolylines.push(<Polyline 
        key           = {`gPolyline_infoMap_white_${this.props.path}__${i}`}
        path          = {polylineCoordinates}
        strokeColor   = "#ffffff"
        strokeWeight  = {5}
        strokeOpacity = {0.8}
        icons         = {[{
          icon  : gArrowWhite,
          offset: '50%'
        }]}
        zIndex = {400 || Math.ceil((1000.0 / i)*1000.0)}
      />);

      gPolylines.push(<Polyline 
        key           = {`gPolyline_infoMap_${this.props.path}__${i}`}
        path          = {polylineCoordinates}
        strokeColor   = {(linestring.properties && linestring.properties.active ? linestringActiveColor : linestringColor)}
        strokeWeight  = {3}
        strokeOpacity = {0.4}
        icons         = {[{
          icon  : gArrow,
          offset: '50%'
        }]}
        zIndex = {500 || Math.ceil((1000.0 / i)*1000.0)}
      />);
    }

    // prepare polygons:
    for (let i = 0, countI = polygons.length; i < countI; i++)
    {
      const polygon   = polygons[i];
      const polygonCoordinates = polygon.geometry.coordinates[0].map((coordinates) => ({lat: coordinates[1], lng: coordinates[0]}));

      gPolygons.push(<Polygon
        key           = {`gPolygon_infoMap_${this.props.path}__${i}`}
        paths         = {polygonCoordinates}
        strokeColor   = {polygon.properties.strokeColor || "#0000FF"}
        strokeOpacity = {polygon.properties.strokeOpacity || 0.8}
        strokeWeight  = {polygon.properties.strokeWeight || 2}
        fillColor     = {polygon.properties.fillColor || "#0000FF"}
        fillOpacity   = {polygon.properties.fillOpacity || 0.35} />
      );
      if (polygon.properties.minLat && polygon.properties.maxLat && polygon.properties.minLong && polygon.properties.maxLong) {
        this.bounds.extend({lat: polygon.properties.minLat, lng: polygon.properties.minLong});
        this.bounds.extend({lat: polygon.properties.maxLat, lng: polygon.properties.maxLong});
        this.bounds.extend({lat: polygon.properties.minLat, lng: polygon.properties.maxLong});
        this.bounds.extend({lat: polygon.properties.maxLat, lng: polygon.properties.minLong});

      }  
    }

    if (this.map && this.bounds)
    {
      this.map.fitBounds(this.bounds);
    }

    return (
      <div className="survey-info-map__map-container">
        <Markdown className="infoMap-title" source={title} />
        <Map
          className       = "info-map"
          google          = {this.props.google}
          containerStyle  = {{boxSizing: 'border-box', position: 'relative', width: '100%', height:'400px', border: '1px solid rgba(0,0,0,0.2'}}
          center          = {this.state.center}
          onReady         = {this.onMapReady}
          gestureHandling = 'greedy'
          maxZoom         = {this.props.widgetConfig.maxZoom || 18}
        >
        {gMarkers}
        {gPolylines}
        {gPolygons} 
        </Map>
      </div>
    );
  }
}

//const mapStateToProps = (state, props) => {
//  return {
//    interview: state.survey.interview
//  };
//};

export default GoogleApiWrapper({...googleConfig})(withTranslation()(InfoMap))