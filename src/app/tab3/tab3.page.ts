import { Component } from '@angular/core';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: false,
})
export class Tab3Page {
  team = [
    {
      name: 'Makkam Santosh Kumar',
      role: 'Founder',
      photo: 'assets/img/team/sarah.jpg',
    },
    // {
    //   name: 'John Doe',
    //   role: 'Lead Developer',
    //   photo: 'assets/img/team/john.jpg',
    // },
  ];
  constructor() {}
}
