// src/app/login/login.page.ts
import { Component, OnInit } from '@angular/core';
import { IonCard, IonicModule, LoadingController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [IonicModule, FormsModule, RouterModule, CommonModule],
})
export class ProfilePage implements OnInit {
  constructor() {}

  ngOnInit() {}
}
