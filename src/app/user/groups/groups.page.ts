import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent, IonIcon, IonRefresher, IonRefresherContent,
  ViewWillEnter, AlertController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline, optionsOutline, calendarOutline, desktopOutline,
  imageOutline, chatbubbleOutline, exitOutline, peopleOutline,
  hourglassOutline, checkmarkCircleOutline, closeCircleOutline,
} from 'ionicons/icons';
import { Auth } from '../../auth';
import { DataService } from '../../shared/data.service';
import { AppMenuService } from '../../shared/app-menu.service';
import { humanError } from '../../shared/errors';
import { ExitReason, GroupScreen } from '../../shared/models';

type Tab = 'joined' | 'pending' | 'sold';

/** My Groups — what I've bought, what I've listed, and what's awaiting review. */
@Component({
  selector: 'app-user-groups',
  templateUrl: './groups.page.html',
  styleUrls: ['./groups.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonIcon,
    IonRefresher, IonRefresherContent,
  ],
})
export class UserGroupsPage implements ViewWillEnter {
  @ViewChild('proofInput') proofInput!: ElementRef<HTMLInputElement>;

  tab: Tab = 'joined';

  /** The membership a faulty-account claim is being raised against. */
  private claimFor: GroupScreen | null = null;

  joined: GroupScreen[] = [];
  mine: GroupScreen[] = [];
  loading = true;

  constructor(
    private auth: Auth,
    private data: DataService,
    private menu: AppMenuService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {
    addIcons({
      arrowBackOutline, optionsOutline, calendarOutline, desktopOutline,
      imageOutline, chatbubbleOutline, exitOutline, peopleOutline,
      hourglassOutline, checkmarkCircleOutline, closeCircleOutline,
    });
  }

  ionViewWillEnter() { this.load(); }

  async load() {
    this.loading = true;
    try {
      const me = this.auth.currentUser?.id;
      const [joined, mine] = await Promise.all([
        this.data.getMyMemberships(),
        me ? this.data.getGroups({ sellerId: me }) : Promise.resolve([]),
      ]);
      this.joined = joined;
      this.mine = mine;
    } catch (e) {
      this.toast(humanError(e, 'Could not load your groups'));
    } finally {
      this.loading = false;
    }
  }

  async refresh(ev: CustomEvent) {
    await this.load();
    (ev.target as HTMLIonRefresherElement).complete();
  }

  get pending() { return this.mine.filter(g => g.status === 'pending' || g.status === 'rejected'); }
  get sold()    { return this.mine.filter(g => g.status === 'approved' || g.status === 'full'); }

  get shown(): GroupScreen[] {
    if (this.tab === 'joined')  return this.joined;
    if (this.tab === 'pending') return this.pending;
    return this.sold;
  }

  back() { this.router.navigate(['/user/home']); }
  openMenu() { this.menu.open(); }

  /** Days left on a seat I bought. Negative means it has ended. */
  daysLeft(g: GroupScreen) {
    if (!g.dateTo) return 0;
    const end = new Date(g.dateTo).getTime();
    return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  }

  statusLabel(g: GroupScreen) {
    if (this.tab === 'joined') {
      const d = this.daysLeft(g);
      if (g.memberStatus === 'exited')  return 'Exited';
      if (g.memberStatus === 'expired' || d < 0) return 'Ended';
      if (d <= 2) return `Ends in ${Math.max(0, d)} day${d === 1 ? '' : 's'}`;
      return `${d} days left`;
    }
    switch (g.status) {
      case 'pending':  return 'Waiting for approval';
      case 'rejected': return 'Rejected';
      case 'full':     return 'All seats filled';
      default:         return 'Live';
    }
  }

  statusTone(g: GroupScreen) {
    if (this.tab === 'joined') {
      const d = this.daysLeft(g);
      if (g.memberStatus === 'exited' || g.memberStatus === 'expired' || d < 0) return 'grey';
      return d <= 2 ? 'red' : 'green';
    }
    if (g.status === 'pending')  return 'amber';
    if (g.status === 'rejected') return 'red';
    return 'green';
  }

  chat(g: GroupScreen) {
    this.router.navigate(['/user/chats']);
  }

  async viewProof(g: GroupScreen) {
    const alert = await this.alertCtrl.create({
      header: 'Subscription proof',
      message: g.proofUrl
        ? `Uploaded: ${g.proofUrl}`
        : 'No screenshot was uploaded for this group.',
      buttons: ['Close'],
    });
    await alert.present();
  }

  /** Section 4 of the agreed spec — leaving a group early. */
  async requestExit(g: GroupScreen) {
    const d = this.daysLeft(g);
    if (d <= 0) { this.toast('This membership has already ended'); return; }

    const alert = await this.alertCtrl.create({
      header: 'Leave this group?',
      subHeader: `${d} day${d === 1 ? '' : 's'} unused`,
      message:
        'Changed your mind — you get half of the unused amount back, straight away.<br><br>' +
        'Account not working — you get all of it back, but we need a photo and ' +
        'an admin has to check it first.',
      inputs: [
        { name: 'reason', type: 'radio', label: 'Changed my mind', value: 'personal', checked: true },
        { name: 'reason', type: 'radio', label: 'Account is not working', value: 'faulty' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Continue',
          handler: (reason: ExitReason) => {
            if (reason === 'faulty') this.startFaultyClaim(g);
            else this.confirmPersonal(g);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private async confirmPersonal(g: GroupScreen) {
    const alert = await this.alertCtrl.create({
      header: 'Are you sure?',
      message:
        'You will get back half of your unused amount. The rest goes to the ' +
        'seller and the platform. This cannot be undone.',
      buttons: [
        { text: 'Stay in the group', role: 'cancel' },
        {
          text: 'Leave',
          role: 'destructive',
          handler: async () => {
            try {
              await this.data.requestExit({ memberId: g.id, reason: 'personal' });
              await this.auth.refresh();
              await this.load();
              this.toast('You have left the group. Your refund is in your wallet.');
            } catch (e) {
              this.toast(humanError(e, 'Could not leave the group'));
            }
          },
        },
      ],
    });
    await alert.present();
  }

  /** Faulty claims need a photo, so the file picker comes first. */
  private startFaultyClaim(g: GroupScreen) {
    this.claimFor = g;
    this.proofInput.nativeElement.click();
  }

  async onProofPicked(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    const g = this.claimFor;
    (e.target as HTMLInputElement).value = '';
    if (!file || !g) return;

    if (file.size > 5 * 1024 * 1024) { this.toast('Photo must be under 5MB'); return; }

    const alert = await this.alertCtrl.create({
      header: 'What is wrong?',
      subHeader: 'An admin reads this before deciding.',
      inputs: [{
        name: 'note', type: 'textarea',
        placeholder: 'e.g. the password was changed and I cannot log in',
      }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Send claim',
          handler: async (d) => {
            if (!d.note?.trim()) { this.toast('Please describe the problem'); return false; }
            try {
              await this.data.requestExit({
                memberId: g.id, reason: 'faulty',
                note: d.note.trim(), proof: file,
              });
              await this.load();
              this.toast('Claim sent. We will review it and get back to you.');
            } catch (err) {
              this.toast(humanError(err, 'Could not send the claim'));
            }
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  browse() { this.router.navigate(['/user/category']); }
  share()  { this.router.navigate(['/user/creategroup']); }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 3000, position: 'bottom' });
    t.present();
  }
}
