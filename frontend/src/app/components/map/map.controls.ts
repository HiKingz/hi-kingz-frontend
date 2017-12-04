import * as mapboxgl from 'mapbox-gl';
import { decode } from '@mapbox/polyline';
import { environment } from '../../../environments/environment';

// Global vars
const request = new XMLHttpRequest();

// 'Template' for setting sources without redefining this object over and over again
const point_src = {
  'type': 'FeatureCollection',
  'features': [{
    'type': 'Feature',
    'geometry': {
      'type': 'Point',
      'coordinates': [0, 0]
    }
  }]
};

const waypoints = {};
let wp_next_id = 0;
let draggedPoint: string;
let isDragging = false;
let instance: PlanningControl;

export class PlanningControl {

  _wpList;
  _container;
  _map: mapboxgl.Map;

  constructor() {
    instance = this;
  }

  onAdd(map) {
    this._map = map;
    this._container = document.createElement('div');
    this._container.className = 'mapboxgl-ctrl';
    this._container.textContent = 'Route Planning';
    this._wpList = document.createElement('div');
    this._container.appendChild(this._wpList);
    map.on('click', this.handleClick);

    /* const el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage = 'url(https://image.flaticon.com/icons/svg/149/149060.svg)';
    el.style.backgroundAttachment = 'top';
    el.style.backgroundSize = '25px,25px';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.width = '25px';
    el.style.height = '50px';

    new mapboxgl.Marker(el)
      .setLngLat([8.24, 50.7])
      .addTo(map); */

    map.on('load', function() {
      map.addSource('route_source', {
        'type' : 'geojson',
        'data' : {
          'type' : 'Feature',
          'properties' : {},
          'geometry' : {
            'type' : 'LineString',
            'coordinates' : [0, 0]
          }
        }
      });
      map.addLayer({
        'id' : 'route',
        'type': 'line',
        'source': 'route_source',
        'layout': {
          'line-join': 'round',
          'line-cap' : 'round'
        },
        'paint': {
          'line-color': '#888',
          'line-width': 3
        }
      });
      map.on('mousedown', instance.mouseDown);
    });

    return this._container;
  }

  public handleClick(e) {
    // alert('You clicked the map at ' + e.lngLat);

    // create a DOM element for the marker
    /*const el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundImage = 'url(https://image.flaticon.com/icons/svg/149/149060.svg)';
    el.style.backgroundAttachment = 'top';
    el.style.backgroundSize = '25px,25px';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.width = '25px';
    el.style.height = '50px';

    const marker = new mapboxgl.Marker(el)
      .setLngLat(e.lngLat)
      .addTo(overlay);

    waypoints.push(marker); */

    const coords = e.lngLat;

    const wp_id = 'point' + wp_next_id;
    instance._map.addSource(wp_id, {
      'type': 'geojson',
      'data': {
        'type': 'FeatureCollection',
        'features': [{
          'type': 'Feature',
          'geometry': {
            'type': 'Point',
            'coordinates': [ coords.lng, coords.lat ]
          }
        }]
      }
    });

    instance._map.addLayer({
      'id': wp_id,
      'type': 'circle',
      'source': wp_id,
      'paint': {
        'circle-radius': 10,
        'circle-color': '#00A0FF'
      }
    });

    instance._map.on('mouseenter', wp_id, function() {
      instance._map.getCanvasContainer().style.cursor = 'move';
      draggedPoint = wp_id;
      instance._map.dragPan.disable();
    });
    instance._map.on('mouseleave', wp_id, function() {
      if (isDragging) {
        return; // YOU SHALL NOT LEAVE
      }
      instance._map.getCanvasContainer().style.cursor = '';
      draggedPoint = null;
      instance._map.dragPan.enable();
    });

    waypoints[wp_id] = [coords.lng, coords.lat];

    wp_next_id++;

    instance.fetchDirections();
  }

  mouseDown() {
    if (!draggedPoint) {
      return;
    }

    isDragging = true;

    // Set a cursor indicator
    instance._map.getCanvasContainer().style.cursor = 'grab';

    // Mouse events
    instance._map.on('mousemove', instance.onMove);
    instance._map.once('mouseup', instance.onUp);
  }

  onMove(e) {
    if (!draggedPoint) {
      return;
    }
    const coords = e.lngLat;

    // Set a UI indicator for dragging.
    instance._map.getCanvasContainer().style.cursor = 'grabbing';

    // Update the Point feature in `geojson` coordinates
    // and call setData to the source layer `point` on it.
    point_src.features[0].geometry.coordinates = [coords.lng, coords.lat];
    instance._map.getSource(draggedPoint).setData(point_src);
    waypoints[draggedPoint] = [coords.lng, coords.lat];


  }

  onUp(e) {
    if (!draggedPoint) {
      return;
    }

    isDragging = false;

    const coords = e.lngLat;

    // Print the coordinates of where the point had
    // finished being dragged to on the map.
    // coordinates.style.display = 'block';
    // coordinates.innerHTML = 'Longitude: ' + coords.lng + '<br />Latitude: ' + coords.lat;
    instance._map.getCanvasContainer().style.cursor = '';

    // Unbind mouse events
    instance._map.off('mousemove', instance.onMove);

    instance.fetchDirections();
  }

  public displayRoute(route, route_wps) {

    const geojson = {
      'type' : 'Feature',
      'properties' : {},
      'geometry' : {
        'type' : 'LineString',
        'coordinates' : []
      }
    };

    const decoded = decode(route.geometry, 5).map(function(c) {
      return c.reverse();
    });

    decoded.forEach(function(c, i) {
      geojson.geometry.coordinates.push(c);
    });



    instance._map.getSource('route_source').setData(geojson);
    this._container.removeChild(this._wpList);
    this._wpList = document.createElement('div');
    this._container.appendChild(this._wpList);
    route_wps.forEach((wp) => {
      const div = document.createElement('div');
      div.className = 'hi-kingz-waypoint-list-element';
      const a = document.createElement('a');
      a.className = 'hi-kingz-waypoint-list-element-text';
      a.href = 'javascript:;';
      if (wp.name) {
        a.textContent = wp.name;
      } else {
        a.textContent = wp.location;
      }
      a.onclick = () => {
        this._map.flyTo({
            // These options control the ending camera position: centered at
            // the target, at zoom level 9, and north up.
            center: wp.location,
            zoom: 15,
            bearing: 0,

            // These options control the flight curve, making it move
            // slowly and zoom out almost completely before starting
            // to pan.
            speed: 5.0, // make the flying slow
            curve: 1, // change the speed at which it zooms out

            // This can be any easing function: it takes a number between
            // 0 and 1 and returns another number between 0 and 1.
            easing: function (t) {
              return t;
            }
          }
        );
        return null;
      };
      const del = document.createElement('div');
      del.className = 'hi-kingz-waypoint-list-element-delete';

      div.appendChild(a);
      div.appendChild(del);

      this._wpList.appendChild(div);
    });
  }

  private buildQuery() {
    const query = [];
    for (const key in waypoints) {
      if (true) { // Warum will TSLint so eine Kacke haben?!
        query.push([waypoints[key][0], waypoints[key][1]].join(','));
      }
    }
    return query.join(';');
  }

  private fetchDirections() {
    const query = instance.buildQuery();

    // Request params
    const options = [];
    options.push('geometries=polyline');
    // if (alternatives) { options.push('alternatives=true'); }
    // if (congestion) { options.push('annotations=congestion'); }
    options.push('steps=false');
    options.push('overview=full');
    if (environment.mapbox.accessToken) { options.push('access_token=' + environment.mapbox.accessToken); }
    request.abort();
    request.open('GET', `https://api.mapbox.com/directions/v5/mapbox/walking/${query}.json?${options.join('&')}`, true);

    request.onload = () => {
      // alert('Got response');
      if (request.status >= 200 && request.status < 400) {
        const data = JSON.parse(request.responseText);
        if (data.error) {
          return data.error;
        }

        if (data.routes[0]) {
          instance.displayRoute(data.routes[0], data.waypoints);
        }

      }
    }
    request.onerror = () => {
      alert(JSON.parse(request.responseText).message);
    };

    request.send();
  }

  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._map = undefined;
  }
}
