import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar,IonButton,IonIcon,IonButtons,IonSelectOption } from '@ionic/angular/standalone';
import { AlertController, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, createOutline, trashOutline, searchOutline } from 'ionicons/icons';
 
@Component({
  selector: 'app-usermngmnt',
  templateUrl: './usermngmnt.page.html',
  styleUrls: ['./usermngmnt.page.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule,IonIcon,
  ]
})
export class UsermngmntPage implements OnInit {
  searchTerm = ''; roleFilter = 'all';
 
  allUsers = [
    { id:'u1', name:'Bharath', uniqueNum:322, mobile:'+91 98765 43210', email:'b@mail.com', role:'buyer',  roleLabel:'Buyer',  status:'active',   wallet:'1,240' },
    { id:'u2', name:'Meera',   uniqueNum:58,  mobile:'+91 87654 32109', email:'m@mail.com', role:'seller', roleLabel:'Seller', status:'active',   wallet:'3,800' },
    { id:'u3', name:'Arjun',   uniqueNum:88,  mobile:'+91 76543 21098', email:'a@mail.com', role:'buyer',  roleLabel:'Buyer',  status:'active',   wallet:'540'   },
    { id:'u4', name:'Deepa',   uniqueNum:201, mobile:'+91 65432 10987', email:'d@mail.com', role:'seller', roleLabel:'Seller', status:'inactive', wallet:'900'   },
    { id:'u5', name:'Rajan',   uniqueNum:91,  mobile:'+91 54321 09876', email:'r@mail.com', role:'seller', roleLabel:'Seller', status:'active',   wallet:'2,100' },
  ];
 
  filteredUsers = [...this.allUsers];
 
  constructor(private alertCtrl: AlertController, private toastCtrl: ToastController) {
    addIcons({ arrowBackOutline, createOutline, trashOutline, searchOutline });
  }
  ngOnInit() {}
 
  filterUsers() {
    const t = this.searchTerm.toLowerCase();
    this.filteredUsers = this.allUsers.filter(u => {
      const matchRole = this.roleFilter === 'all' || u.role === this.roleFilter;
      const matchSearch = !t || u.name.toLowerCase().includes(t) || u.mobile.includes(t) || u.email.includes(t) || String(u.uniqueNum).includes(t);
      return matchRole && matchSearch;
    });
  }
 
  async editUser(u: any) {
    const alert = await this.alertCtrl.create({
      header: `Edit ${u.name}`,
      inputs: [
        { name: 'name',  type: 'text',  value: u.name,   placeholder: 'Full Name'   },
        { name: 'mobile',type: 'text',  value: u.mobile,  placeholder: 'Mobile'     },
        { name: 'email', type: 'email', value: u.email,   placeholder: 'Email'      },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Save', handler: data => { Object.assign(u, data); /* TODO: API call */ } },
      ],
    });
    await alert.present();
  }
 
  async deleteUser(u: any) {
    const alert = await this.alertCtrl.create({
      header: 'Delete User',
      message: `Are you sure you want to delete ${u.name} (${u.uniqueNum})?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Delete', role: 'destructive', handler: () => {
          this.allUsers.splice(this.allUsers.indexOf(u), 1);
          this.filterUsers(); // TODO: API call
        }},
      ],
    });
    await alert.present();
  }
 
  addUser() { /* TODO: navigate to add user form */ }
}
 

