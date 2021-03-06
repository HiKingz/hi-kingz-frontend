import {Component, OnInit, ViewEncapsulation, ViewChild, Input, Output, EventEmitter, Injector, ValueProvider} from '@angular/core';
import {Route} from '../../routes/route.model';
import {MapComponent} from '../map/map.component';
import {MatDialog} from '@angular/material';
import {Point} from '../../coordinates/point.model';
import {MediaDialogComponent} from '../media-dialog/media-dialog.component';
import {File} from '../../files/file.model';
import {Waypoint} from '../../coordinates/waypoint.model';
import {UserDataService} from '../../user-data/user-data.service';
import {FirebaseItem} from '../../commons/models/firebase.model';
import {OverlayModule, Overlay, OverlayRef} from '@angular/cdk/overlay';
import {CdkPortal, ComponentPortal, Portal} from '@angular/cdk/portal';
import {MetaUiComponent, MetaCallbacks} from '../meta-ui/meta-ui.component';
import {Poi} from '../../pois/poi.model';
import {MarkerControl} from '../map/map.controls';
import {RatingAggregation} from '../../commons/models/rateable';
import {PoiService} from '../../pois/poi.service';
import {LoginDialogService} from '../../authentication/login-dialog.service';


@Component({
  selector: 'app-route-ui',
  templateUrl: './route-ui.component.html',
  styleUrls: ['./route-ui.component.css'],
  encapsulation: ViewEncapsulation.None
})

export class RouteUIComponent implements OnInit {

  overlayRef: OverlayRef;
  metaUIPortal: ComponentPortal<MetaUiComponent>;

  mapComp: MapComponent;

  markerControl: any;
  _readonlyBefore: boolean;

  ownsRoute: boolean;

  _tmpPOI: Poi;

  _route: FirebaseItem<Route>;
  @Input()
  set route(rt: FirebaseItem<Route>) {
    this._route = rt;
    this.ownsRoute = (this.userDataService.currentUserData &&
      this.userDataService.currentUserData.userSignature.id === this._route.item.userSignature.id);
  }
  get route (): FirebaseItem<Route> {
    return this._route;
  }

  @Input() readonly: boolean;
  markerMode: boolean; // Set to false while POI Maker is active
  @Output() routeSaved = new EventEmitter();



  constructor(public dialog: MatDialog,
              private userDataService: UserDataService,
              private overlay: Overlay,
              private poiService: PoiService,
              private loginSrvc: LoginDialogService) {
    // this._route = new Route(null, null, null, null, null, null, <[Waypoint]>[], new Direction(<[Point]>[]), null, null);
    this.overlayRef = this.overlay.create({
      height: '100%',
      width: '100%'
    });
    this.markerMode = false;
  }

  ngOnInit() {
    this.userDataService.onCurrentUserDataUpdated.subscribe((userData) => {
      this.ownsRoute =
        (userData && userData.userSignature.id === this._route.item.userSignature.id);
    });
  }

  @ViewChild(MapComponent)
  set appMap(comp: MapComponent) {
    this.mapComp = comp;
    this.mapComp.newMarker.subscribe(this.newPoi);
    this.markerControl = new MarkerControl(this.mapComp);
  }

  private getCharEnum(i: number): String {
    let res = '';
    while (i > 24) {
      res = String.fromCharCode(i % 24 + 65) + res;
      i = Math.floor(i / 24);
    }
    res = String.fromCharCode(i % 24 + 65) + res;

    return res;
  }

  // Center the map on the 'i'th waypoint in the _route
  public centerOn(i: number) {
    this.mapComp.flyTo(this.route.item.waypoints[i].point);
  }

  private centerOnUserPos() {
    const self = this;
    navigator.geolocation.getCurrentPosition((pos) => {
      self.flyTo(new Point(pos.coords.longitude, pos.coords.latitude));
    });
  }

  private deleteWaypointAt(i: number) {
    this.mapComp.deleteWaypoint.emit(i);
  }

  saveRoute = () => {
    const self = this;
    if (!this.userDataService.currentUserData) {
      this.loginSrvc.open();
      this.userDataService.onCurrentUserDataUpdated.first((userData, i, src) => {
        self.saveRoute();
        this.readonly = true; // Go back to showing mode
        return true;
      });
    } else {
      this.routeSaved.emit();
      this.readonly = true; // Go back to showing mode
    }
  }

  public flyTo(location: Point) {
    this.mapComp.flyTo(location);
  }

  public enablePOIAdder() {
    this._readonlyBefore = this.readonly;
    this.readonly = true;
    this.markerMode = true;
    this.mapComp.map.addControl(this.markerControl);
  }

  public disablePOIAdder() {
    this.readonly = this._readonlyBefore;
    this.markerMode = false;
    this.mapComp.map.removeControl(this.markerControl);
  }

  public newPoi = (coords: any) => {
    this._tmpPOI = new Poi([], '', '',
      this.userDataService.currentUserData.userSignature, new RatingAggregation(0, 0, 0),
      new Point(coords[0], coords[1]));

    this.toggleMetaUI([this._tmpPOI, false]);
  }

  // Wird als callBack zum schließen übergeben, da funktioniert es nur mit dieser Syntax, weil "this" sonst wieder was anderes ist.
  // data[0]: Fileable-Instanz deren Infos angezeigt weden soll
  // data[1]: Readonly
  // data[2]: saving Callback, optional
  // data[3]: closing Callback, optional
  public toggleMetaUI = (data: Array<any>) => {
    if (!this.metaUIPortal) {
      this.metaUIPortal = new ComponentPortal(MetaUiComponent,
        null,
        Injector.create([
          {provide: Boolean, useValue: data[1]},
          {provide: 'MetaUiData', useValue: data[0]},
          {
            provide: MetaCallbacks,
            useValue: new MetaCallbacks(
              this.closeMetaUIAndSavePOI,
              this.toggleMetaUI
            )
          },
          {provide: String, useValue: data.length > 2 ? data[2] : null},
        ])
      );
      this.overlayRef.attach(this.metaUIPortal);
    } else {
      this.overlayRef.detach();
      this.metaUIPortal = null;
    }
  }

  public closeMetaUIAndSavePOI = () => {
    if (this.metaUIPortal) {
      this.overlayRef.detach();
      this.metaUIPortal = null;
    }
    this.poiService.create(this._tmpPOI).then(poi_obs => {
      poi_obs.first((poi, i, src) => {
        this.mapComp.addPoi(poi);
        return true;
      });
    });
    this.mapComp.map.removeControl(this.markerControl);
    this.readonly = this._readonlyBefore;
    this.markerMode = false;
  }
}
