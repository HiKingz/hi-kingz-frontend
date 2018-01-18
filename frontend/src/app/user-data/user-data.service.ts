import {Injectable} from '@angular/core';
import {AngularFirestore} from 'angularfire2/firestore';
import {Observable} from 'rxjs/Observable';
import {UserData, UserSignature} from './user-data.model';
import {FirestoreDataService} from '../commons/firestore-data-services';
import {FirebaseItem} from '../commons/models/firebase.model';
import {AuthenticationService} from '../authentication/authentication.service';
import 'rxjs/add/operator/first';
import * as firebase from 'firebase';
import {Subscription} from 'rxjs/Subscription';
import {Subject} from 'rxjs/Subject';

@Injectable()
export class UserDataService extends FirestoreDataService<UserData> {
  private _currentUserDataLoadedSubject: Subject<UserData> = new Subject<UserData>();
  private _currentUserDataUnsetSubject: Subject<void> = new Subject<void>();
  private _currentUserDataSubscription: Subscription;
  protected readonly _collectionPath: string = 'user-data';
  public currentUserData: UserData = null;
  public onCurrentUserDataLoaded: Observable<UserData> = this._currentUserDataLoadedSubject.asObservable();
  public onCurrentUserDataUnset: Observable<void> = this._currentUserDataUnsetSubject.asObservable();

  constructor(db: AngularFirestore, private _authService: AuthenticationService) {
    super(db);
    this._authService.onLogin.subscribe(() => this._loadCurrentUserData());
    this._authService.onLogout.subscribe(() => this._unsetCurrentUserData);
  }

  public async create(user: UserSignature): Promise<Observable<FirebaseItem<UserData>>> {
    const firebaseItem = new FirebaseItem<UserData>(
      this._concatPaths(this._collectionPath, user.id),
      new UserData(user, [])
    );
    await this._updateOrCreate(firebaseItem);
    this._loadCurrentUserData();
    return this._get(firebaseItem.reference);
  }

  public exists(uid: string): Promise<boolean> {
    return this._exists(this._concatPaths(this._collectionPath, uid));
  }

  public getById(uid: string): Observable<FirebaseItem<UserData>> {
    return this._get(this._concatPaths(this._collectionPath, uid));
  }

  private _loadCurrentUserData() {
    const userId = this._authService.getLoggedInUser().uid;
    this.exists(userId).then(
      exists => {
        if (exists) {
          this._currentUserDataSubscription = this.getById(userId).subscribe(
            (userDataItem) => {
              this.currentUserData = userDataItem.item;
              this._currentUserDataLoadedSubject.next(this.currentUserData);
            }
          );
        }
      }
    );
  }

  private _unsetCurrentUserData(): void {
    if (this._currentUserDataSubscription && !this._currentUserDataSubscription.closed) {
      this._currentUserDataSubscription.unsubscribe();
    }
    this.currentUserData = null;
    this._currentUserDataUnsetSubject.next();
  }

  public update(user: FirebaseItem<UserData>): Promise<void> {
    return this._updateOrCreate(user);
  }

  protected _deserializeData(data: any): UserData {
    return UserData.deserialize(data);
  }
}
