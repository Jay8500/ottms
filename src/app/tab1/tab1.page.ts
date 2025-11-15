import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
// import { lastValueFrom } from 'rxjs';                  // <-- for async/await
// import { HttpClient } from '@angular/common/http';
interface OttInfo {
  id?: number;
  img: string;
  title: string;
  subTitle: string;
  content: string;
}
@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit {
  public ottAdvInfo: OttInfo[] = [];
  public isLoading = true;
  constructor() //private http: HttpClient
  {}

  async ngOnInit() {
    await this.getOttAdvInfo();
  }

  async getOttAdvInfo() {
    this.isLoading = true; // show skeletons
    this.ottAdvInfo = [];
    try {
      // // ---->  YOUR API ENDPOINT HERE  <----
      // const url = 'https://your-api.example.com/ott-plans';

      // // `lastValueFrom` turns Observable → Promise (so we can `await`)
      // const data = await lastValueFrom(this.http.get<OttInfo[]>(url));

      // this.ottAdvInfo = data;
      await new Promise((res) => setTimeout(res, 1000));
      this.ottAdvInfo.push(
        {
          id: 1,
          img: 'assets/ottimgs/netlfix.jpg',
          title: 'NETFLIX Premium 4k',
          subTitle: '1 Month',
          content: 'Get Premium account now for 139 Rupees.',
        },
        {
          id: 2,
          img: 'assets/ottimgs/prime.avif',
          title: 'Amazon Prime Video',
          subTitle: '1 month',
          content: 'Get Premium account now for 139 Rupees.',
        },
        {
          id: 3,
          img: 'assets/ottimgs/zee5.png',
          title: 'Zee 5',
          subTitle: '1 Month',
          content: 'Get Premium account now for 139 Rupees.',
        },
        {
          id: 4,
          img: 'assets/ottimgs/yt.jpg',
          title: 'Youtube',
          subTitle: '1 Month',
          content: 'Get Premium account now for 139 Rupees.',
        },
        {
          id: 5,
          img: 'assets/ottimgs/hotstar.png',
          title: 'Hot Star',
          subTitle: '1 Month',
          content: 'Get Premium account now for 139 Rupees.',
        },
        {
          img: 'assets/ottimgs/aha.jpg',
          title: 'aha',
          subTitle: '1 Month',
          content: 'Get Premium account now for 139 Rupees.',
        }
      );
      this.isLoading = false; // hide skeletons
    } catch (err) {
      console.error('Failed to load OTT plans', err);
    } finally {
      this.isLoading = false; // hide skeletons
    }
  }

  onEnquiryClick(attInfo: any) {}
}
