import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent, IonIcon, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, star, starOutline, checkmarkCircle } from 'ionicons/icons';
import { DataService } from '../../shared/data.service';
import { humanError } from '../../shared/errors';
import { Badge, ChatThread } from '../../shared/models';

@Component({
  selector: 'app-rating',
  templateUrl: './rating.page.html',
  styleUrls: ['./rating.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonIcon],
})
export class RatingPage implements OnInit {
  thread: ChatThread | null = null;
  badges: Badge[] = [];

  stars = 0;
  body = '';
  chosenBadge: string | null = null;

  loading = true;
  submitting = false;
  error = '';

  readonly labels = ['', 'Poor', 'Not great', 'Okay', 'Good', 'Excellent'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private data: DataService,
    private toastCtrl: ToastController,
  ) {
    addIcons({ arrowBackOutline, star, starOutline, checkmarkCircle });
  }

  async ngOnInit() {
    const threadId = this.route.snapshot.queryParamMap.get('thread');
    this.loading = true;
    try {
      const [threads, badges] = await Promise.all([
        this.data.getThreads(),
        this.data.getBadges(),
      ]);
      this.thread = threads.find(t => t.id === threadId) ?? threads[0] ?? null;
      this.badges = badges;
      if (!this.thread) this.error = 'Nothing to rate yet.';
    } catch (e) {
      this.error = 'Could not load.';
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  get who() {
    if (!this.thread) return '';
    return this.thread.isGroup ? this.thread.sellerName : this.thread.peerName;
  }

  set(n: number) { this.stars = n; }

  pickBadge(b: Badge) {
    this.chosenBadge = this.chosenBadge === b.id ? null : b.id;
  }

  back() { this.router.navigate(['/user/chat'], { queryParams: { thread: this.thread?.id } }); }

  async submit() {
    if (!this.stars) { this.toast('Pick a star rating first'); return; }
    if (!this.thread) return;

    this.submitting = true;
    try {
      await this.data.submitRating({
        threadId: this.thread.id,
        stars: this.stars,
        body: this.body.trim() || undefined,
        badgeId: this.chosenBadge ?? undefined,
      });
      this.toast('Thanks — your rating has been saved');
      this.back();
    } catch (e: any) {
      const raw = String(e?.message ?? e);
      this.toast(
        /duplicate|unique/i.test(raw)
          ? 'You have already rated this deal'
          : humanError(e, 'Could not save your rating'),
      );
    } finally {
      this.submitting = false;
    }
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2600, position: 'bottom' });
    t.present();
  }
}