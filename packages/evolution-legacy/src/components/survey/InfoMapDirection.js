/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { withTranslation }  from 'react-i18next';
import ReactMapboxGl, { Popup, Layer, Feature, GeoJSONLayer } from 'react-mapbox-gl';
import _get from 'lodash.get';
import  {
    bbox as turfBbox,
    length as turfLength,
    along as turfAlong,
    bearing as turfBearing,
    lineString as turfLineString,
    distance as turfDistance,
    destination as turfDestination,
    midpoint as turfMidpoint,
    bezierSpline as turfBezierSpline
} from '@turf/turf';
import ResizeObserver from 'resize-observer-polyfill';



const Map = ReactMapboxGl({
  accessToken: process.env.MAPBOX_ACCESS_TOKEN
});


class InfoMapDirection extends React.Component {

  constructor(props) {
    super(props);

    this.defaultZoomArray = [props.zoom  || 13];
    this.defaultCenter    = props.widgetConfig.defaultCenter || [-73.6,45.5];

    this.state            = {
      dragging: false,
      onMapMarkers: null
    };
    this.map                = null;
    this.ref                = React.createRef();
    //this.onZoomEnd        = this.onZoomEnd.bind(this);
    //this.onDragEnd        = this.onDragEnd.bind(this);
    this.handleMapResize    = this.handleMapResize.bind(this);
    this.handleResize       = this.handleResize.bind(this);
    //this.handleMapClick   = this.handleMapClick.bind(this);
    this.onFeatureDragEnd   = this.onFeatureDragEnd.bind(this);
    this.onFeatureDragStart = this.onFeatureDragStart.bind(this);
    this.onFeatureClick     = this.onFeatureClick.bind(this);
    this.onShapeClick       = this.onShapeClick.bind(this);
    this.resizeObserver     = new ResizeObserver( entries => {
      this.handleResize();
    });
  }

  onShapeClick(e) {
    this.props.selectTrip(e.feature.properties.tripUuid);
  }

  onZoomEnd(map, event) {
  }

  onDragEnd(map, event) {
    //const centerLatLng = event.target.getCenter();
    //console.log(event.target.getCenter());
  }

  handleMapResize(map, bounds) {
    //console.log('handleMapResize');
    if (!this.map)
    {
      this.map = map;
    }
    map.fitBounds(bounds, {padding: 50, animate: false});
    map.resize();
  }

  handleResize() {
    //console.log('handleResize');

    if (this.map)
    {
      this.map.resize();
    }
  }

  componentDidMount() {
    if (this.ref.current)
    {
      this.resizeObserver.observe(this.ref.current);
    }
    this.props.widgetConfig.mapMarkers(this.props.interview).then(function(onMapMarkers) {
      this.setState({
        onMapMarkers: onMapMarkers
      });
    }.bind(this));
    
  }

  componentWillUnmount() {
    if (this.ref.current)
    {
      this.ref.current.removeEventListener('resize', this.handleResize);
    }
  }

  onFeatureDragStart(e) {
    this.setState({
      dragging: true
    });
  }

  onFeatureDragEnd(e, place) {
    this.props.startUpdateInterview('validation', {
      [place.path]: [e.lngLat.lng, e.lngLat.lat]
    }, null, null, function() {
      this.setState({
        dragging: false
      });
      console.log('updated coordinates for path', place.path);
    }.bind(this));
  }

  onFeatureClick(e) {
    this.props.selectPlace(e.feature.properties.path);
  }

  render() {
    
    const mapMarkers = this.state.onMapMarkers;

    if (!mapMarkers)
    {
      return null;
    }

    const markers              = [];
    const markerIcons          = [];
    const points               = [];
    const pointIcons           = [];
    const modeMarkers          = [];
    const modeIcons            = [];
    const walkShapes           = [];
    const tripShapes           = [];
    const arrowMarkers         = [];
    const arrowIcons           = [];
    const boundsCoordinates    = [];
    const popups               = [];

    const places        = _get(mapMarkers, 'places', null);
    const tripSegments  = _get(mapMarkers, 'tripSegments', null);
    const pointsList    = _get(mapMarkers, 'points', null);
    const walkSegments  = _get(mapMarkers, 'walkSegments', null)

    // Building the markers
    for (let i = 0, count = places.length; i < count; i++) // building the places in the trip
    {
      const place = places[i];
      if (place.activity)
      {
        const icon  = new Image(40,40);
        icon.src    = `/dist/images/activities_icons/${place.activity}_marker.svg`;
        markerIcons.push([place.path, icon]);
        
        const marker = (
          <Feature 
            key          = {place.path}
            coordinates  = {place.coordinates}
            properties   = {{...place}}
            draggable    = {false}
            // onClick      = {this.onFeatureClick}
            // onDragEnd    = {(e) => this.onFeatureDragEnd(e, place)}
            // onDragStart  = {this.onFeatureDragStart}
          />
        );
        if (place.name && this.state.dragging === false)
        {
          const popup = (
            <Popup
              key         = {place.path}
              coordinates = {place.coordinates}
              anchor      = "bottom"
              offset      = {[0,-30]}
            >
              <p>{place.name}</p>
            </Popup>
          );
          popups.push(popup);
        }
        boundsCoordinates.push(place.coordinates);
        markers.push(marker);
      }    
    }

    for (let i = 0, count = pointsList.length; i < count; i++) // // building the points
    {
      const point     = pointsList[i];
      const icon      = new Image(15,15);
      icon.src        = `/dist/images/map_icons/circle.svg`;
      pointIcons.push([point.path, icon]);
      
      const pointToAdd = (
        <Feature 
          key          = {point.path}
          coordinates  = {point.coordinates} 
          properties   = {{...point}}
          draggable    = {false}
          // onClick      = {this.onFeatureClick}
          // onDragEnd    = {(e) => this.onFeatureDragEnd(e, point)}
          // onDragStart  = {this.onFeatureDragStart}
        />
      );
      boundsCoordinates.push(point.coordinates);
      points.push(pointToAdd);
    }    

    // Building the walk sections
    const arrowIcon  = new Image(10,10);
    arrowIcon.src    = `/dist/images/interface_icons/arrow-up-solid.svg`;
    arrowIcons.push(['arrow', arrowIcon]);

    for (let i = 0, count = walkSegments.length; i < count; i++) //building acces and degress part
    {
      const walkSegment = walkSegments[i];

      const midpoint           = turfMidpoint(walkSegment.coordinates[0], walkSegment.coordinates[1]);
      const distance           = turfDistance(walkSegment.coordinates[0], walkSegment.coordinates[1]);
      const bearing            = turfBearing(walkSegment.coordinates[0], walkSegment.coordinates[1]);
      const bezierBearing      = bearing + 90;
      const offsetMidPoint     = turfDestination(midpoint, 0.15 * distance, bezierBearing);
      const bezierLine         = turfLineString([walkSegment.coordinates[0], offsetMidPoint.geometry.coordinates, walkSegment.coordinates[1]]);
      const bezierCurve        = turfBezierSpline(bezierLine, {sharpness: 1.5});

      const walkShape = (
        <Feature 
          key          = {walkSegment.key}
          coordinates  = {bezierCurve.geometry.coordinates}
          properties   = {{...walkSegment}}
          // onClick      = {this.onShapeClick}
        />      );
      walkShapes.push(walkShape);
    }

    // building the line for each segment    
    for (let i = 0, count = tripSegments.length; i < count; i++)
    {
      const trip = tripSegments[i];
      const mode     = trip.properties.mode;
      const tripLength = turfLength(trip, {units: 'meters'})
      const tripShapeMiddlePoint = turfAlong(trip, tripLength/2, {units: 'meters'})

      const tripShape = (
        <Feature 
          key          = {trip.properties.id}
          coordinates  = {trip.geometry.coordinates}
          properties   = {{...trip.properties}}
          // onClick      = {this.onShapeClick}
        />
      );
      tripShapes.push(tripShape);
      boundsCoordinates.push(...trip.geometry.coordinates);
            

      if (mode)
      {
        const modeIcon = new Image(25,25);
        modeIcon.src   = `/dist/images/modes_icons/${mode}.png`;
        modeIcons.push(['mode_' + trip.properties.id, modeIcon]);
        // const offsetStart = - (25 * countJ) / 2;
        const modeMarker = (
          <Feature 
            key          = {'mode_' + trip.properties.id}
            coordinates  = {tripShapeMiddlePoint.geometry.coordinates}
            properties   = {{path: 'mode_' + trip.properties.id,  offset: [0, -25]}}
          />
        );
        modeMarkers.push(modeMarker);
        if (trip.properties.text && this.state.dragging === false)
        {
          const popup = (
            <Popup
              key         = {'mode_' + trip.properties.id}
              coordinates = {tripShapeMiddlePoint.geometry.coordinates}
              anchor      = "bottom"
              offset      = {[0,-30]}
            >
              <p dangerouslySetInnerHTML={{ __html: trip.properties.text }} />
            </Popup>
          );
          popups.push(popup);
        }
        boundsCoordinates.push(tripShapeMiddlePoint.geometry.coordinates);
      }
    }



    let bounds = null;
    try {
      bounds = turfBbox(turfLineString(boundsCoordinates));
    }
    catch
    {
      return null;
    }
    return (
      <div className="direction-map-container" ref={this.ref}>
        <Map
          style            = {`mapbox://styles/mapbox/streets-v9`}
          center           = {this.defaultCenter} // use constant otherwise the center will get back to default after state changes
          zoom             = {this.defaultZoomArray}
          onDragEnd        = {this.onDragEnd}
          onStyleLoad      = {(e) => this.handleMapResize(e, [[bounds[0], bounds[1]], [bounds[2], bounds[3]+0.002]])}
          onClick          = {this.handleMapClick}
          //onMouseMove    = {events.map.onMouseMove.bind(this)}
          containerStyle  = {{
            boxSizing: 'border-box', 
            position: 'relative', 
            width: '100%', 
            height:'400px', 
            border: '1px solid rgba(0,0,0,0.2'
        }}>
          { popups }
          { walkShapes.length > 0 && <Layer
            id    = 'walkShapes'
            key   = "walkShapes"
            type  = "line"
            
            paint = {{
              'line-color': ['get', 'color'],
              'line-width': [
                'match',
                ['get', 'active'],
                'true', 10,
                'false', 5,
                5
              ],
              'line-dasharray': [1, .5],
            }}
          >
            { walkShapes }
          </Layer>}
          { tripShapes.length > 0 && <Layer
            id    = 'tripShapes'
            key   = "tripShapes"
            type  = "line"
            
            paint = {{
              'line-color': ['get', 'color'],
              'line-width': [
                'match',
                ['get', 'active'],
                'true', 10,
                'false', 5,
                5
              ],
            }}
          >
            { tripShapes }
          </Layer>}
          { arrowMarkers.length > 0 && <Layer
            id     = 'arrows'
            key    = "arrows"
            type   = "symbol"
            layout = {{ "icon-image": 'arrow', "icon-rotate": ["get", "bearing"], "icon-allow-overlap": true, "icon-offset" : [0, 0], "icon-size" : 1.0}}
            images = {arrowIcons}
          >
            { arrowMarkers }
          </Layer>}
          { modeMarkers.length > 0 && <Layer
            id     = 'modes'
            key    = "modes"
            type   = "symbol"
            layout = {{ "icon-image": ['get', 'path'], "icon-allow-overlap": true, "icon-offset" : ['get', 'offset'], "icon-size" : [
              'match',
                ['get', 'active'],
                'true', 1.0,
                'false', 0.7,
                0.7
            ]}}
            images = {modeIcons}
          >
            { modeMarkers }
          </Layer>}
          { points.length > 0 && <Layer
            id     = 'points'
            key    = "points"
            type   = "symbol"
            layout = {{ "icon-image": ['get', 'path'], "icon-allow-overlap": true, "icon-offset" : [0, 0], "icon-size" : [
              'match',
                ['get', 'active'],
                'true', 1.0,
                'false', 0.7,
                0.7
            ]}}
            images = {pointIcons}
          >
            { points }
          </Layer>}
          { markers.length > 0 && <Layer
            id     = 'places'
            key    = "places"
            type   = "symbol"
            layout = {{ "icon-image": ['get', 'path'], "icon-allow-overlap": true, "icon-offset" : [0, -20], "icon-size" : [
              'match',
                ['get', 'active'],
                'true', 1.0,
                'false', 0.7,
                0.7
            ]}}
            images = {markerIcons}
          >
            { markers }
          </Layer>}
        </Map>
      </div>
    );
  }

}


export default withTranslation()(InfoMapDirection)