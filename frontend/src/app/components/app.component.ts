import { Component } from '@angular/core';
import {MatDialog, MatSnackBar} from "@angular/material";
import {AuthenticationService} from "../authentication/authentication.service";
import {LoginComponent} from "./login/login.component";
import * as firebase from "firebase";
import {environment} from "../../environments/environment";


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app';

  constructor(public dialog: MatDialog,
              private authenticationService: AuthenticationService,
              public snackBar: MatSnackBar){
    firebase.initializeApp(environment.firebase);
  }

  login(){
    this.dialog.open(LoginComponent, {
      width: '400px'
    });
  }

  logout(){
    this.authenticationService.logout()
      .then(()=>{
        this.snackBar.open('Logout successful', null, {duration: 1000});
      })
      .catch((error)=>{
        console.log(error);
      })
  }

}
