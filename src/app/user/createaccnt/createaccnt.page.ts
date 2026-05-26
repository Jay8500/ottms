import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-createaccnt',
  templateUrl: './createaccnt.page.html',
  styleUrls: ['./createaccnt.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class CreateaccntPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
