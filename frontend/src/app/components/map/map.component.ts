import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { environment } from '../../../environments/environment';

import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import 'rxjs/add/operator/switchMap';

import * as mapboxgl from 'mapbox-gl';
import { decode } from '@mapbox/polyline';
import {instantiateDefaultStyleNormalizer} from '@angular/platform-browser/animations/src/providers';
import * as ctrls from './map.controls';

import {Route} from '../../routes/route.model';

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

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class MapComponent implements OnInit {

  map: mapboxgl.Map;
  @Input() rt: Route;
  cli;
  // map: mapboxgl.Map;

  constructor(private route: ActivatedRoute,
              private router: Router) {
    mapboxgl.accessToken = 'pk.eyJ1Ijoic3RhbmRieW1vZGUiLCJhIjoiY2o5NzZqMTdmMDQzMDJ3cnc5aW5ueXNmeSJ9.q_l4vASYPsSkfHrAxPGjbw';
  }

  ngOnInit() {
    this.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/outdoors-v9',
      zoom: 13,
      center: [8.24, 50.7]
    });

    if (this.rt.direction.points.length === 0) {
      this.map.addControl(new ctrls.PlanningControl(this), 'top-left');
    }
  }
}
