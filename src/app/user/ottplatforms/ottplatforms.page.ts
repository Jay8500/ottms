import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-ottplatforms',
  templateUrl: './ottplatforms.page.html',
  styleUrls: ['./ottplatforms.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class OttplatformsPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
