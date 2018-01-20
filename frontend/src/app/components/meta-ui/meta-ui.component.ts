import {Component, Inject, OnInit} from '@angular/core';
import {ENTER, COMMA, SPACE} from '@angular/cdk/keycodes';
import {FileService} from '../../files/file.service';
import {File} from '../../files/file.model';
import {Route} from '../../routes/route.model';
import {Poi} from '../../pois/poi.model';
import {animate, state, style, transition, trigger} from '@angular/animations';
import {MatChipInputEvent} from '@angular/material';
import {RatingService} from '../../ratings/rating.service';
import {PaginatedDataView} from '../../commons/firestore-data-services';
import {Rating} from '../../ratings/rating.model';
import {Rateable} from '../../commons/models/rateable';
import {FirebaseItem} from '../../commons/models/firebase.model';

export class MetaCallbacks {
  constructor(public saveCallback: Function, public closeCallback: Function) {}
}

export class MetaUiVisibilityState {
  public static OPEN = 'open';
  public static CLOSED = 'closed';
}

@Component({
  selector: 'app-meta-ui',
  templateUrl: './meta-ui.component.html',
  styleUrls: ['./meta-ui.component.css'],
  animations: [
    trigger('slideOut', [
      state(MetaUiVisibilityState.OPEN, style({transform: 'translateY(0)', opacity: 1})),
      state(MetaUiVisibilityState.CLOSED, style({transform: 'translateY(100%)', opacity: 0})),
      transition(
        MetaUiVisibilityState.OPEN + ' => ' +  MetaUiVisibilityState.CLOSED,
        animate('400ms ease-out')
      )
    ]),
    trigger('fadeOut', [
      state(MetaUiVisibilityState.OPEN, style({opacity: 1})),
      state(MetaUiVisibilityState.CLOSED, style({opacity: 0})),
      transition(
        MetaUiVisibilityState.OPEN + ' => ' +  MetaUiVisibilityState.CLOSED,
        animate('400ms ease-out')
      )
    ])
  ]
})

export class MetaUiComponent implements OnInit {
  public visibilityState = MetaUiVisibilityState.OPEN;
  public Math = Math;
  public isRoute: boolean;
  public separatorKeysCodes = [ENTER, COMMA, SPACE];
  public paginatedRatingsView: PaginatedDataView<Rating>;

  constructor(
    private _fileService: FileService,
    private _ratingService: RatingService,
    public readOnly: boolean,
    @Inject('MetaUiData') private data: Route | Poi,
    private _callbacks: MetaCallbacks,
    private _dataFirestoreReference: string,
  ) {
    this.isRoute = data instanceof Route;

    if (this._dataFirestoreReference) {
      this.paginatedRatingsView = this._ratingService.getPaginatedView(
        new FirebaseItem<Rateable>(this._dataFirestoreReference, data)
      );
      this.paginatedRatingsView.data.subscribe(items => console.log(items));
      // this.paginatedRatingsView.loadNextPage();
    }
  }

  async closeUi() {
    this.visibilityState = MetaUiVisibilityState.CLOSED;
    await (new Promise(res => setTimeout(res, 400)));
    this._callbacks.closeCallback();
  }

  public fileChanged(event) {
    const file = event.target.files.item(0);
    const task = this._fileService.upload(file);
    task.then().then((val) => {
      this.data.files.push(new File(val.downloadURL));
    });
  }

  public saveObject() {
    this._callbacks.saveCallback();
  }

  public addTag(event: MatChipInputEvent): void {
    if (this.data instanceof Route) {
      const input = event.input;
      const value = event.value;

      if ((value || '').trim()) {
        this.data.tags.push(value.trim());
      }

      if (input) {
        input.value = '';
      }
    }
  }

  ngOnInit() {console.log(this._dataFirestoreReference)}
}
