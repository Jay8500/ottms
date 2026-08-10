import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  AppUser, Badge, BadgeAward, BankChangeRequest, Category, ChatMessage,
  ChatThread, CommerceOption, ExitRequest,
  FaqItem, FormField, GroupScreen, HomeButton, LangCode, Localized,
  NotificationRule, OttApp, PaymentConfig, Referral, SocialLink, UserRating,
  ValidityPlan, WalletSummary, WalletTx,
} from './models';

/**
 * Single data layer for the whole app. Pages never see a query.
 *
 * Reads and CMS writes go straight to Supabase. Anything that moves money
 * calls an RPC instead of writing tables, so a purchase or a withdrawal is
 * one Postgres transaction and the client cannot post its own amounts.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private sb = inject(SupabaseService);
  private get db() { return this.sb.client; }

  // ══ Catalog ═════════════════════════════════════════════════════════════

  async getCategories(): Promise<Category[]> {
    const { data, error } = await this.db
      .from('categories')
      .select('*, ott_apps(count)')
      .order('position');
    if (error) throw error;
    return (data ?? []).map(r => ({
      id: r.id, title: r.title, subName: r.sub_name ?? '',
      color: r.color, icon: r.icon, imageUrl: r.image_url ?? undefined,
      position: r.position, active: r.active,
      appCount: r.ott_apps?.[0]?.count ?? 0,
    }));
  }

  async getOttApps(categoryId?: string): Promise<OttApp[]> {
    let q = this.db
      .from('ott_apps')
      .select('*, ott_plan_tiers(*)')
      .order('position');
    if (categoryId) q = q.eq('category_id', categoryId);

    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(r => this.toOttApp(r));
  }

  async getOttApp(id: string): Promise<OttApp | null> {
    const { data, error } = await this.db
      .from('ott_apps').select('*, ott_plan_tiers(*)').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? this.toOttApp(data) : null;
  }

  private toOttApp(r: any): OttApp {
    return {
      id: r.id, categoryId: r.category_id, title: r.title,
      subName: r.sub_name ?? '', brand: r.brand, color: r.color, icon: r.icon,
      imageUrl: r.image_url ?? undefined, position: r.position, active: r.active,
      startingPrice: Number(r.starting_price ?? 0),
      sellers: 0, available: 0,
      tiers: (r.ott_plan_tiers ?? [])
        .sort((a: any, b: any) => a.position - b.position)
        .map((t: any) => ({ id: t.id, label: t.label, maxScreens: t.max_screens })),
    };
  }

  async getValidityPlans(): Promise<ValidityPlan[]> {
    const { data, error } = await this.db
      .from('validity_plans')
      .select('*, plan_prices(amount, save_upto)')
      .order('position');
    if (error) throw error;
    return (data ?? []).map(r => ({
      id: r.id, title: r.title, subName: r.sub_name ?? '',
      color: r.color, icon: r.icon, imageUrl: r.image_url ?? undefined,
      position: r.position, active: r.active, months: r.months,
      amount: Number(r.plan_prices?.[0]?.amount ?? 0),
      saveUpto: Number(r.plan_prices?.[0]?.save_upto ?? 0),
    }));
  }

  // ══ People ══════════════════════════════════════════════════════════════

  async getUsers(): Promise<AppUser[]> {
    // user_stats (view, migration 0004) carries the real rating average and
    // activity counters — without it every profile reads as 0 reviews.
    const [{ data, error }, { data: stats }] = await Promise.all([
      this.db.from('profiles').select('*, bank_details(*)').order('created_at'),
      this.db.from('user_stats').select('*'),
    ]);
    if (error) throw error;

    const byUser = new Map((stats ?? []).map(s => [s.user_id, s]));
    const badges = await this.getBadges();
    return (data ?? []).map(r => this.toUser(r, badges, byUser.get(r.id)));
  }

  async getUser(id: string): Promise<AppUser | null> {
    const [{ data, error }, { data: stat }] = await Promise.all([
      this.db.from('profiles').select('*, bank_details(*)').eq('id', id).maybeSingle(),
      this.db.from('user_stats').select('*').eq('user_id', id).maybeSingle(),
    ]);
    if (error) throw error;
    if (!data) return null;
    return this.toUser(data, await this.getBadges(), stat);
  }

  private toUser(r: any, allBadges: Badge[], stat?: any): AppUser {
    const bank = Array.isArray(r.bank_details) ? r.bank_details[0] : r.bank_details;
    return {
      id: r.id, name: r.name, nickName: r.nick_name ?? '',
      uniqueNumber: r.unique_number, mobile: r.mobile, email: r.email ?? '',
      role: r.role, isSeller: r.is_seller, avatarUrl: r.avatar_url ?? undefined,
      registeredDate: new Date(r.created_at).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      }),
      mobileVerified: r.mobile_verified, emailVerified: r.email_verified,
      isOnline: r.is_online,
      rating: Math.round(Number(stat?.rating_avg ?? 0)),
      reviewCount: Number(stat?.review_count ?? 0),
      badges: allBadges.slice(0, Number(stat?.badge_count ?? 0)),
      bank: bank ? {
        holderName: bank.holder_name, upiId: bank.upi_id ?? '',
        accountNo: bank.account_no ?? '', ifsc: bank.ifsc ?? '', locked: bank.locked,
      } : undefined,
      walletAmount: Number(r.wallet_locked) + Number(r.wallet_unlocked),
      lockedAmount: Number(r.wallet_locked),
      unlockedAmount: Number(r.wallet_unlocked),
      groupsJoined: Number(stat?.groups_joined ?? 0),
      groupsCreated: Number(stat?.groups_created ?? 0),
      txCount: Number(stat?.tx_count ?? 0),
    };
  }

  async getBadges(): Promise<Badge[]> {
    const { data, error } = await this.db.from('badges').select('*').order('position');
    if (error) throw error;
    return (data ?? []).map(r => ({
      id: r.id, label: r.label, emoji: r.emoji, color: r.color,
    }));
  }

  // ══ Money ═══════════════════════════════════════════════════════════════

  async getTransactions(userId?: string): Promise<WalletTx[]> {
    let q = this.db
      .from('wallet_transactions')
      .select('*, counterparty:counterparty_id(name, unique_number, mobile), groups(ott_apps(title, brand))')
      .order('created_at', { ascending: false });
    if (userId) q = q.eq('user_id', userId);

    const { data, error } = await q;
    if (error) throw error;

    return (data ?? []).map(r => {
      const created = new Date(r.created_at);
      const app = r.groups?.ott_apps;
      return {
        id: r.id, userId: r.user_id,
        txType: r.tx_type, txKind: r.tx_kind, status: r.status,
        amount: Number(r.amount),
        txDate: created.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        txTime: created.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        txnRef: r.txn_ref ?? undefined,
        screenshotUrl: r.screenshot_url ?? undefined,
        ottName: app?.title, brand: app?.brand,
        partyName: r.counterparty?.name, partyUniqueNum: r.counterparty?.unique_number,
        partyMobile: r.counterparty?.mobile,
        paymentApp: r.payment_app ?? undefined,
        rejectReason: r.reject_reason ?? undefined,
      } as WalletTx;
    });
  }

  async getWalletSummaries(): Promise<WalletSummary[]> {
    const { data, error } = await this.db
      .from('profiles')
      .select('id, name, unique_number, avatar_url, wallet_locked, wallet_unlocked, wallet_transactions(tx_kind, status)')
      .order('name');
    if (error) throw error;

    return (data ?? []).map(r => {
      const txs = r.wallet_transactions ?? [];
      const wd = txs.filter((t: any) => t.tx_kind === 'withdraw');
      const locked = Number(r.wallet_locked);
      const unlocked = Number(r.wallet_unlocked);
      return {
        userId: r.id, name: r.name, uniqueNumber: r.unique_number,
        avatarUrl: r.avatar_url ?? undefined,
        total: locked + unlocked, locked, unlocked,
        withdrawCount: wd.length,
        withdrawDeclined: wd.filter((t: any) => t.status === 'rejected').length,
        withdrawSuccess: wd.filter((t: any) => t.status === 'cleared').length,
        fundsAdded: txs.filter((t: any) => t.tx_kind === 'addfund').length,
        net: 0,
      };
    });
  }

  async getDashboardStats() {
    const [users, sellers, live, pendingGroups, pendingPayments, fees] = await Promise.all([
      this.count('profiles'),
      this.count('profiles', q => q.eq('is_seller', true)),
      this.count('groups', q => q.in('status', ['approved', 'full'])),
      this.count('groups', q => q.eq('status', 'pending')),
      this.count('wallet_transactions', q => q.eq('status', 'pending')),
      // Revenue is what the platform actually kept — service charges and
      // penalties — not the total value of everything that changed hands.
      this.db.from('wallet_transactions')
        .select('amount')
        .in('tx_kind', ['service_fee', 'penalty'])
        .eq('status', 'cleared'),
    ]);

    const revenue = (fees.data ?? []).reduce((s, r) => s + Number(r.amount), 0);

    return {
      totalUsers: users, activeSellers: sellers, activeScreens: live,
      pendingGroups, pendingPayments, revenue,
    };
  }

  private async count(table: string, refine?: (q: any) => any): Promise<number> {
    let q = this.db.from(table).select('*', { count: 'exact', head: true });
    if (refine) q = refine(q);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  }

  // ══ Groups ══════════════════════════════════════════════════════════════

  async getGroups(opts?: { sellerId?: string; status?: GroupScreen['status'] }): Promise<GroupScreen[]> {
    let q = this.db
      .from('groups')
      .select('*, ott_apps(title, brand), ott_plan_tiers(label), profiles!groups_seller_id_fkey(name, unique_number, avatar_url), group_members(count)')
      .order('created_at', { ascending: false });
    if (opts?.sellerId) q = q.eq('seller_id', opts.sellerId);
    if (opts?.status)   q = q.eq('status', opts.status);

    const { data, error } = await q;
    if (error) throw error;

    return (data ?? []).map(r => ({
      id: r.id,
      ottId: r.ott_app_id,
      ottName: r.ott_apps?.title ?? '',
      brand: r.ott_apps?.brand ?? '',
      tierLabel: r.ott_plan_tiers?.label ?? '',
      months: r.months,
      dateFrom: this.day(r.date_from),
      dateTo: this.day(r.date_to),
      seatsTotal: r.seats_total,
      seatsFilled: r.group_members?.[0]?.count ?? 0,
      status: r.status,
      proofUrl: r.proof_url ?? undefined,
      comment: r.comment ?? undefined,
      price: Number(r.price),
      sellerId: r.seller_id,
      sellerName: r.profiles?.name ?? '',
      sellerUniqueNum: r.profiles?.unique_number ?? 0,
      sellerAvatarUrl: r.profiles?.avatar_url ?? undefined,
      flags: r.status === 'pending' ? ['Pending Details'] : [],
    }));
  }

  /** Seats this user has bought — the "Joined" tab on My Groups. */
  async getMyMemberships(): Promise<GroupScreen[]> {
    const me = await this.sb.currentUserId();
    if (!me) return [];

    const { data, error } = await this.db
      .from('group_members')
      .select('*, groups(*, ott_apps(title, brand), ott_plan_tiers(label), profiles!groups_seller_id_fkey(name, unique_number))')
      .eq('buyer_id', me)
      .order('joined_on', { ascending: false });
    if (error) throw error;

    return (data ?? []).map(m => {
      const g = m.groups;
      return {
        id: m.id,
        ottId: g?.ott_app_id,
        ottName: g?.ott_apps?.title ?? '',
        brand: g?.ott_apps?.brand ?? '',
        tierLabel: g?.ott_plan_tiers?.label ?? '',
        months: g?.months ?? 0,
        dateFrom: this.day(m.joined_on),
        dateTo: this.day(m.expires_on),
        seatsTotal: g?.seats_total ?? 0,
        seatsFilled: 0,
        status: 'approved' as GroupScreen['status'],
        price: Number(g?.price ?? 0),
        sellerId: g?.seller_id,
        sellerName: g?.profiles?.name ?? '',
        sellerUniqueNum: g?.profiles?.unique_number ?? 0,
        memberStatus: m.status,
        amountPaid: Number(m.amount_paid),
        proofUrl: g?.proof_url ?? undefined,
        flags: [],
      };
    });
  }

  // ══ Chat ════════════════════════════════════════════════════════════════

  async getThreads(): Promise<ChatThread[]> {
    const me = await this.sb.currentUserId();
    const { data, error } = await this.db
      .from('chat_threads')
      .select('*, buyer:buyer_id(name, unique_number), seller:seller_id(name, unique_number, is_online), groups(months, ott_apps(title, brand), ott_plan_tiers(label))')
      .order('last_at', { ascending: false, nullsFirst: false });
    if (error) throw error;

    return (data ?? []).map(r => ({
      buyerMediaUnlocked: r.buyer_media_unlocked ?? false,
      sellerMediaUnlocked: r.seller_media_unlocked ?? false,
      iAmBuyer: r.buyer_id === me,
      id: r.id,
      isGroup: !!r.group_id,
      peerName: r.buyer?.name,
      peerUniqueNum: r.buyer?.unique_number,
      ottName: r.groups?.ott_apps?.title,
      brand: r.groups?.ott_apps?.brand,
      tierLabel: r.groups?.ott_plan_tiers?.label,
      months: r.groups?.months,
      sellerName: r.seller?.name,
      sellerUniqueNum: r.seller?.unique_number,
      lastMessage: r.last_message ?? '',
      lastTime: r.last_at
        ? new Date(r.last_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : '',
      unread: 0,
      isOnline: r.seller?.is_online ?? false,
      locked: r.locked,
    }));
  }

  async getThread(id: string): Promise<ChatThread | null> {
    return (await this.getThreads()).find(t => t.id === id) ?? null;
  }

  async getMessages(threadId: string): Promise<ChatMessage[]> {
    const me = await this.sb.currentUserId();
    const { data, error } = await this.db
      .from('chat_messages').select('*').eq('thread_id', threadId).order('created_at');
    if (error) throw error;

    return (data ?? []).map(r => ({
      id: r.id, threadId: r.thread_id,
      text: r.body ?? undefined, imageUrl: r.image_url ?? undefined,
      isMine: r.sender_id === me,
      time: new Date(r.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    }));
  }

  /**
   * A rating left after a completed deal. Ties to the membership so the RLS
   * policy can verify the rater was actually part of it, and so the unique
   * constraint stops the same deal being rated twice.
   */
  async submitRating(input: {
    threadId: string;
    stars: number;
    body?: string;
    badgeId?: string;
  }) {
    const me = await this.sb.currentUserId();
    if (!me) throw new Error('Not signed in');

    const { data: thread, error: tErr } = await this.db
      .from('chat_threads').select('buyer_id, seller_id, group_id')
      .eq('id', input.threadId).single();
    if (tErr) throw tErr;

    // You rate the other side of the conversation.
    const ratedUserId = thread.buyer_id === me ? thread.seller_id : thread.buyer_id;

    let memberId: string | null = null;
    if (thread.group_id) {
      const { data: m } = await this.db
        .from('group_members').select('id')
        .eq('group_id', thread.group_id).eq('buyer_id', thread.buyer_id)
        .maybeSingle();
      memberId = m?.id ?? null;
    }

    const { error } = await this.db.from('ratings').insert({
      rated_user_id: ratedUserId,
      rater_user_id: me,
      group_member_id: memberId,
      stars: input.stars,
      body: input.body ?? null,
    });
    if (error) throw error;

    if (input.badgeId) {
      await this.db.from('badge_awards').insert({
        badge_id: input.badgeId,
        user_id: ratedUserId,
        awarded_by: me,
        group_member_id: memberId,
      });
    }
  }

  /**
   * Flags a thread for admin review. This is the only thing that lets an
   * admin read its messages — see the messages_read policy in 0002.
   */
  async reportThread(threadId: string, note?: string) {
    const { error } = await this.db.from('chat_threads')
      .update({ reported: true, report_note: note ?? null })
      .eq('id', threadId);
    if (error) throw error;
  }

  /**
   * Live messages for one thread.
   *
   * RLS applies to the stream too, so this only ever delivers rows the
   * signed-in user could read anyway. Returns an unsubscribe function —
   * call it when leaving the page or the socket leaks.
   */
  onNewMessage(threadId: string, handler: (m: ChatMessage) => void): () => void {
    let cancelled = false;

    const channel = this.db
      .channel(`thread:${threadId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `thread_id=eq.${threadId}` },
        async (payload) => {
          if (cancelled) return;
          const r: any = payload.new;
          const me = await this.sb.currentUserId();
          handler({
            id: r.id,
            threadId: r.thread_id,
            text: r.body ?? undefined,
            imageUrl: r.image_url ?? undefined,
            isMine: r.sender_id === me,
            time: new Date(r.created_at).toLocaleTimeString('en-IN', {
              hour: '2-digit', minute: '2-digit',
            }),
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      this.db.removeChannel(channel);
    };
  }

  /** Live updates to the thread list — new conversations, last message, lock state. */
  onThreadChange(handler: () => void): () => void {
    const channel = this.db
      .channel('threads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_threads' }, () => handler())
      .subscribe();
    return () => { this.db.removeChannel(channel); };
  }

  /** Q5 — either side may unlock; photos need both. Re-locks on chat close. */
  setMediaUnlock(threadId: string, unlocked: boolean) {
    return this.sb.rpc('set_media_unlock', { p_thread: threadId, p_unlocked: unlocked });
  }

  setPresence(online: boolean) {
    return this.sb.rpc('set_presence', { p_online: online }).catch(() => { /* best effort */ });
  }

  /** Uploads a chat photo and returns a viewable signed URL. */
  async sendChatImage(threadId: string, file: File) {
    const me = await this.sb.currentUserId();
    if (!me) throw new Error('Not signed in');
    if (file.size > 5 * 1024 * 1024) throw new Error('Image must be under 5MB');

    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = await this.sb.upload('chat-images', `${threadId}/${Date.now()}.${ext}`, file);
    const url = await this.sb.signedUrl('chat-images', path, 60 * 60 * 24 * 7);
    return this.sendMessage(threadId, undefined, url);
  }

  async sendMessage(threadId: string, text?: string, imageUrl?: string) {
    const me = await this.sb.currentUserId();
    if (!me) throw new Error('Not signed in');

    const { data, error } = await this.db.from('chat_messages')
      .insert({ thread_id: threadId, sender_id: me, body: text ?? null, image_url: imageUrl ?? null })
      .select().single();
    if (error) throw error;

    await this.db.from('chat_threads')
      .update({ last_message: text ?? '📷 Photo', last_at: new Date().toISOString() })
      .eq('id', threadId);

    return {
      id: data.id, threadId, text, imageUrl, isMine: true,
      time: new Date(data.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    } as ChatMessage;
  }

  // ══ Reputation ══════════════════════════════════════════════════════════

  async getRatings(): Promise<UserRating[]> {
    const { data, error } = await this.db
      .from('ratings')
      .select('*, rated:rated_user_id(name, unique_number)')
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data ?? []).map(r => ({
      id: r.id, userId: r.rated_user_id,
      userName: r.rated?.name ?? '', userUniqueNum: r.rated?.unique_number ?? 0,
      stars: r.stars, text: r.body ?? '', date: this.day(r.created_at),
    }));
  }

  async getBadgeAwards(): Promise<BadgeAward[]> {
    const { data, error } = await this.db
      .from('badge_awards')
      .select('*, badges(label, emoji, positive), profiles:user_id(name, unique_number)')
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data ?? []).map(r => ({
      id: r.id, userId: r.user_id,
      userName: r.profiles?.name ?? '', userUniqueNum: r.profiles?.unique_number ?? 0,
      label: r.badges?.label ?? '', emoji: r.badges?.emoji ?? '⭐',
      positive: r.badges?.positive ?? true,
      date: this.day(r.created_at),
    }));
  }

  // ══ Content ═════════════════════════════════════════════════════════════

  async getHomeButtons(): Promise<HomeButton[]> {
    const { data, error } = await this.db.from('home_buttons').select('*').order('position');
    if (error) throw error;
    return (data ?? []).map(r => ({
      id: r.id, title: r.title, color: r.color, icon: r.icon,
      iconPosition: r.icon_position, route: r.route,
      imageUrl: r.image_url ?? undefined, position: r.position, active: r.active,
    }));
  }

  async getCommerceOptions(): Promise<CommerceOption[]> {
    const { data, error } = await this.db.from('commerce_options').select('*').order('position');
    if (error) throw error;
    return (data ?? []).map(r => ({
      id: r.id, title: r.title, subName: r.sub_name ?? '', action: r.action,
      color: r.color, icon: r.icon, imageUrl: r.image_url ?? undefined,
      position: r.position, active: r.active,
    }));
  }

  async getFormFields(): Promise<FormField[]> {
    const { data, error } = await this.db.from('form_fields').select('*').order('position');
    if (error) throw error;
    return (data ?? []).map(r => ({
      id: r.id, label: r.label, placeholder: r.placeholder,
      icon: r.icon, iconBg: r.icon_bg, type: r.field_type,
      required: r.required, enabled: r.enabled,
      requireOtp: r.require_otp, otpCapable: r.otp_capable,
      position: r.position,
    }));
  }

  async getFaqs(): Promise<FaqItem[]> {
    const { data, error } = await this.db
      .from('faqs').select('*, faq_translations(*)').order('position');
    if (error) throw error;

    const blank: Localized = { en: '', hi: '', te: '' };
    return (data ?? []).map(r => {
      const q = { ...blank }, a = { ...blank }, v = { ...blank };
      for (const t of r.faq_translations ?? []) {
        q[t.lang as LangCode] = t.question;
        a[t.lang as LangCode] = t.answer;
        v[t.lang as LangCode] = t.video_url ?? '';
      }
      return { id: r.id, q, a, videoUrl: v, position: r.position };
    });
  }

  async getSocialLinks(): Promise<SocialLink[]> {
    const { data, error } = await this.db.from('social_links').select('*').order('position');
    if (error) throw error;
    return (data ?? []).map(r => ({
      id: r.id, title: r.title, url: r.url, color: r.color, icon: r.icon,
      imageUrl: r.image_url ?? undefined, position: r.position, active: r.active,
    }));
  }

  async getPaymentConfig(): Promise<PaymentConfig> {
    const { data, error } = await this.db.from('payment_config').select('*').eq('id', true).single();
    if (error) throw error;
    return {
      qrImageUrl: data.qr_image_url ?? undefined,
      name: data.name, upiId: data.upi_id, upiMobile: data.upi_mobile,
      bankName: data.bank_name, bankMasked: data.bank_masked,
    };
  }

  async getTerms(): Promise<string> {
    const { data, error } = await this.db
      .from('legal_documents').select('body').eq('slug', 'terms').single();
    if (error) throw error;
    return data.body ?? '';
  }

  /** Money rules, so screens can show the real fee and minimum. */
  async getSettings(): Promise<Record<string, unknown>> {
    const { data, error } = await this.db.from('app_settings').select('key, value');
    if (error) throw error;
    const out: Record<string, unknown> = {};
    for (const r of data ?? []) out[r.key] = r.value;
    return out;
  }

  async getReferrals(): Promise<Referral[]> {
    const { data, error } = await this.db
      .from('referrals')
      .select('*, referrer:referrer_id(name), referred:referred_id(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data ?? []).map(r => ({
      id: r.id,
      code: r.code,
      referrerId: r.referrer_id,
      referrerName: r.referrer?.name ?? '',
      referredId: r.referred_id ?? undefined,
      referredName: r.referred?.name ?? undefined,
      rewardAmount: Number(r.reward_amount),
      rewarded: r.rewarded,
      createdAt: this.day(r.created_at),
    }));
  }

  /** Q4 — bank edits queue here for admin approval instead of applying directly. */
  async getBankChangeRequests(): Promise<BankChangeRequest[]> {
    const { data, error } = await this.db
      .from('bank_change_requests')
      .select('*, profiles:user_id(name, unique_number, mobile)')
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data ?? []).map(r => ({
      id: r.id,
      userId: r.user_id,
      userName: r.profiles?.name ?? '',
      userUniqueNum: r.profiles?.unique_number ?? 0,
      userMobile: r.profiles?.mobile ?? '',
      holderName: r.holder_name,
      upiId: r.upi_id ?? '',
      accountNo: r.account_no ?? '',
      ifsc: r.ifsc ?? '',
      status: r.status,
      rejectReason: r.reject_reason ?? undefined,
      createdAt: this.day(r.created_at),
    }));
  }

  approveBankChange(id: string) {
    return this.sb.rpc('approve_bank_change', { p_request: id });
  }

  rejectBankChange(id: string, reason: string) {
    return this.sb.rpc('reject_bank_change', { p_request: id, p_reason: reason });
  }

  /**
   * First-time bank setup. Allowed straight through by the bank_insert policy
   * because there is nothing yet to protect. Every later change goes through
   * requestBankChange() and needs admin approval (Q4).
   */
  async saveBankDetails(input: {
    holderName: string; upiId?: string; accountNo?: string; ifsc?: string;
  }) {
    const userId = await this.sb.currentUserId();
    if (!userId) throw new Error('Not signed in');
    if (!input.upiId && !input.accountNo) {
      throw new Error('Enter a UPI ID or an account number');
    }

    const { error } = await this.db.from('bank_details').insert({
      user_id: userId,
      holder_name: input.holderName,
      upi_id: input.upiId ?? null,
      account_no: input.accountNo ?? null,
      ifsc: input.ifsc ?? null,
      locked: true,
    });
    if (error) throw error;
  }

  /** Is there already a change waiting on admin? Used to block a second one. */
  async hasPendingBankChange(): Promise<boolean> {
    const userId = await this.sb.currentUserId();
    if (!userId) return false;
    const { count, error } = await this.db
      .from('bank_change_requests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId).eq('status', 'pending');
    if (error) throw error;
    return (count ?? 0) > 0;
  }

  /** Raised by the user from their profile; needs admin sign-off to apply. */
  async requestBankChange(input: {
    holderName: string; upiId?: string; accountNo?: string; ifsc?: string;
  }) {
    const userId = await this.sb.currentUserId();
    if (!userId) throw new Error('Not signed in');
    if (!input.upiId && !input.accountNo) {
      throw new Error('Enter a UPI ID or an account number');
    }

    const { error } = await this.db.from('bank_change_requests').insert({
      user_id: userId,
      holder_name: input.holderName,
      upi_id: input.upiId ?? null,
      account_no: input.accountNo ?? null,
      ifsc: input.ifsc ?? null,
    });
    if (error) throw error;
  }

  async getNotificationRules(): Promise<NotificationRule[]> {
    const { data, error } = await this.db
      .from('notification_rules').select('*').order('key');
    if (error) throw error;
    return (data ?? []).map(r => ({
      key: r.key,
      title: r.title,
      bodyTemplate: r.body_template,
      enabled: r.enabled,
      offsetDays: r.offset_days,
    }));
  }

  async saveNotificationRules(rules: NotificationRule[]) {
    for (const r of rules) {
      const { error } = await this.db.from('notification_rules').update({
        title: r.title,
        body_template: r.bodyTemplate,
        enabled: r.enabled,
        offset_days: r.offsetDays,
        updated_at: new Date().toISOString(),
      }).eq('key', r.key);
      if (error) throw error;
    }
  }

  /** How many devices could actually receive a notification right now. */
  async countDeviceTokens(): Promise<number> {
    return this.count('device_tokens');
  }

  /** Bulk-updates money rules and other config. Admin only, via RLS. */
  async saveSettings(values: Record<string, unknown>) {
    for (const key of Object.keys(values)) {
      const { error } = await this.db
        .from('app_settings')
        .update({ value: values[key], updated_at: new Date().toISOString() })
        .eq('key', key);
      if (error) throw error;
    }
  }

  // ══ CMS writes ══════════════════════════════════════════════════════════

  async saveCategory(c: Category) {
    return this.upsert('categories', {
      id: this.idOrNull(c.id), title: c.title, sub_name: c.subName,
      color: c.color, icon: c.icon, image_url: c.imageUrl,
      position: c.position, active: c.active,
    });
  }
  async deleteCategory(id: string) { return this.del('categories', id); }

  async saveOttApp(a: OttApp) {
    const row = await this.upsert('ott_apps', {
      id: this.idOrNull(a.id), category_id: a.categoryId, title: a.title,
      sub_name: a.subName, brand: a.brand, color: a.color, icon: a.icon,
      image_url: a.imageUrl, starting_price: a.startingPrice,
      position: a.position, active: a.active,
    });

    // Replace the tier set — simplest correct thing while tiers are edited
    // as a whole list rather than individually.
    await this.db.from('ott_plan_tiers').delete().eq('ott_app_id', row.id);
    if (a.tiers.length) {
      const { error } = await this.db.from('ott_plan_tiers').insert(
        a.tiers.map((t, i) => ({
          ott_app_id: row.id, label: t.label, max_screens: t.maxScreens, position: i + 1,
        })),
      );
      if (error) throw error;
    }
    return row;
  }
  async deleteOttApp(id: string) { return this.del('ott_apps', id); }

  async saveValidityPlan(v: ValidityPlan) {
    const row = await this.upsert('validity_plans', {
      id: this.idOrNull(v.id), title: v.title, sub_name: v.subName, months: v.months,
      color: v.color, icon: v.icon, image_url: v.imageUrl,
      position: v.position, active: v.active,
    });
    const { error } = await this.db.from('plan_prices').upsert({
      validity_plan_id: row.id, amount: v.amount, save_upto: v.saveUpto,
    }, { onConflict: 'ott_app_id,ott_plan_tier_id,validity_plan_id' });
    if (error) throw error;
    return row;
  }
  async deleteValidityPlan(id: string) { return this.del('validity_plans', id); }

  async saveHomeButton(b: HomeButton) {
    return this.upsert('home_buttons', {
      id: this.idOrNull(b.id), title: b.title, color: b.color, icon: b.icon,
      icon_position: b.iconPosition, route: b.route, image_url: b.imageUrl,
      position: b.position, active: b.active,
    });
  }
  async deleteHomeButton(id: string) { return this.del('home_buttons', id); }

  async saveCommerceOption(c: CommerceOption) {
    return this.upsert('commerce_options', {
      id: this.idOrNull(c.id), title: c.title, sub_name: c.subName, action: c.action,
      color: c.color, icon: c.icon, image_url: c.imageUrl,
      position: c.position, active: c.active,
    });
  }
  async deleteCommerceOption(id: string) { return this.del('commerce_options', id); }

  async saveFormField(f: FormField) {
    return this.upsert('form_fields', {
      id: this.idOrNull(f.id), label: f.label, placeholder: f.placeholder,
      icon: f.icon, icon_bg: f.iconBg, field_type: f.type,
      required: f.required, enabled: f.enabled,
      require_otp: f.requireOtp, otp_capable: f.otpCapable, position: f.position,
    });
  }
  async deleteFormField(id: string) { return this.del('form_fields', id); }

  async saveFaq(f: FaqItem) {
    const row = await this.upsert('faqs', {
      id: this.idOrNull(f.id), position: f.position, active: true,
    });
    const rows = (['en', 'hi', 'te'] as LangCode[])
      .filter(l => f.q[l]?.trim())
      .map(l => ({
        faq_id: row.id, lang: l, question: f.q[l], answer: f.a[l] ?? '',
        video_url: f.videoUrl?.[l] || null,
      }));
    if (rows.length) {
      const { error } = await this.db.from('faq_translations')
        .upsert(rows, { onConflict: 'faq_id,lang' });
      if (error) throw error;
    }
    return row;
  }
  async deleteFaq(id: string) { return this.del('faqs', id); }

  async saveSocialLink(s: SocialLink) {
    return this.upsert('social_links', {
      id: this.idOrNull(s.id), title: s.title, url: s.url,
      color: s.color, icon: s.icon, position: s.position, active: s.active,
    });
  }
  async deleteSocialLink(id: string) { return this.del('social_links', id); }

  async savePaymentConfig(c: PaymentConfig) {
    const { error } = await this.db.from('payment_config').update({
      qr_image_url: c.qrImageUrl ?? null, name: c.name, upi_id: c.upiId,
      upi_mobile: c.upiMobile, bank_name: c.bankName, bank_masked: c.bankMasked,
      updated_at: new Date().toISOString(),
    }).eq('id', true);
    if (error) throw error;
  }

  async saveTerms(body: string) {
    const { error } = await this.db.from('legal_documents')
      .update({ body, updated_at: new Date().toISOString() })
      .eq('slug', 'terms');
    if (error) throw error;
  }

  async saveRating(r: UserRating) {
    const { error } = await this.db.from('ratings')
      .update({ stars: r.stars, body: r.text }).eq('id', r.id);
    if (error) throw error;
  }
  async deleteRating(id: string) { return this.del('ratings', id); }
  async deleteBadgeAward(id: string) { return this.del('badge_awards', id); }
  async saveBadgeAward(_b: BadgeAward) { /* label edits belong on `badges`, not the award */ }

  /**
   * A seller listing a screen. Lands as `pending` for admin review.
   * Seat count comes from the tier's admin-set limit, and price from the
   * matching validity plan — never from the client.
   */
  async createGroup(input: {
    ottAppId: string;
    tierId: string;
    dateFrom: string;
    dateTo: string;
    comment?: string;
    proofName?: string;
    proofFile?: File;
  }) {
    const sellerId = await this.sb.currentUserId();
    if (!sellerId) throw new Error('Not signed in');

    const from = new Date(input.dateFrom);
    const to = new Date(input.dateTo);
    const months = Math.max(
      1,
      Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30.44)),
    );

    const app = await this.getOttApp(input.ottAppId);
    const tier = app?.tiers.find(t => t.id === input.tierId);
    if (!tier) throw new Error('That plan is no longer available');

    // The seller is using one screen themselves, so a 4-screen plan sells 3.
    const settings = await this.getSettings();
    const keeps = Number(settings['seller_keeps_screens'] ?? 1);
    const sellable = tier.maxScreens - keeps;
    if (sellable < 1) {
      throw new Error(`${tier.label} only has ${tier.maxScreens} screen(s) — none left to share`);
    }

    // Price for this duration, falling back to the platform's starting price.
    const plans = await this.getValidityPlans();
    const match = plans.find(p => p.months === months);
    const price = match?.amount ?? app?.startingPrice ?? 0;

    let proofUrl: string | undefined;
    if (input.proofFile) {
      const ext = input.proofFile.name.split('.').pop() ?? 'jpg';
      proofUrl = await this.sb.upload(
        'group-proofs',
        `${sellerId}/${Date.now()}.${ext}`,
        input.proofFile,
      );
    }

    const { data, error } = await this.db.from('groups').insert({
      seller_id: sellerId,
      ott_app_id: input.ottAppId,
      ott_plan_tier_id: input.tierId,
      validity_plan_id: match?.id ?? null,
      months,
      date_from: input.dateFrom,
      date_to: input.dateTo,
      seats_total: sellable,
      price,
      status: 'pending',
      proof_url: proofUrl ?? input.proofName ?? null,
      comment: input.comment || null,
    }).select().single();

    if (error) throw error;

    // Listing a screen makes you a seller.
    await this.db.from('profiles').update({ is_seller: true }).eq('id', sellerId);
    return data;
  }

  async setGroupStatus(id: string, status: GroupScreen['status'], reason?: string) {
    const { error } = await this.db.from('groups')
      .update({ status, reject_reason: reason ?? null }).eq('id', id);
    if (error) throw error;
  }

  /**
   * Admin balance correction. Goes through adjust_balance() so it writes a
   * ledger entry and a transaction row naming who changed it and why.
   *
   * A direct UPDATE would fail anyway — the profiles_admin_write policy in
   * 0004 blocks balance columns from the client precisely so corrections
   * cannot happen without an audit trail.
   */
  async saveWallet(userId: string, _total: number, locked: number, unlocked: number, reason: string) {
    return this.sb.rpc('adjust_balance', {
      p_user: userId,
      p_locked: locked,
      p_unlocked: unlocked,
      p_reason: reason,
    });
  }

  // ══ Money — RPCs only ═══════════════════════════════════════════════════

  /**
   * A top-up request. Inserted as `pending` — nothing is credited until an
   * admin approves it through approve_add_fund(), which is what actually
   * writes the ledger entry.
   */
  async requestAddFund(input: {
    amount: number;
    paymentApp?: string;
    txnRef?: string;
    screenshot?: File;
  }) {
    const userId = await this.sb.currentUserId();
    if (!userId) throw new Error('Not signed in');
    if (input.amount <= 0) throw new Error('Enter an amount above zero');

    let screenshotUrl: string | undefined;
    if (input.screenshot) {
      const ext = input.screenshot.name.split('.').pop() ?? 'jpg';
      screenshotUrl = await this.sb.upload(
        'payment-proofs',
        `${userId}/${Date.now()}.${ext}`,
        input.screenshot,
      );
    }

    const { data, error } = await this.db.from('wallet_transactions').insert({
      user_id: userId,
      tx_type: 'funded',
      tx_kind: 'addfund',
      status: 'pending',
      amount: input.amount,
      payment_app: input.paymentApp ?? null,
      txn_ref: input.txnRef ?? null,
      screenshot_url: screenshotUrl ?? null,
    }).select().single();

    if (error) throw error;
    return data;
  }

  /**
   * Starts a Cashfree top-up. The Edge Function works out the fee and
   * creates the order; the amount we send is only a request, never trusted.
   */
  async createPaymentOrder(amount: number) {
    const { data, error } = await this.sb.client.functions.invoke<{
      orderId: string;
      paymentSessionId: string;
      walletAmount: number;
      gatewayFee: number;
      chargeAmount: number;
      mode: 'sandbox' | 'production';
    }>('cashfree-create-order', { body: { amount } });

    if (error) throw error;
    if (!data?.paymentSessionId) throw new Error('Could not start the payment');
    return data;
  }

  /** Poll after checkout closes — the webhook may land before or after. */
  async getOrderStatus(cfOrderId: string) {
    const { data, error } = await this.db
      .from('payment_orders')
      .select('status, wallet_amount, failure_reason')
      .eq('cf_order_id', cfOrderId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  purchaseScreen(groupId: string) {
    return this.sb.rpc<string>('purchase_screen', { p_group: groupId });
  }
  requestWithdraw(amount: number, paymentApp?: string) {
    return this.sb.rpc<string>('request_withdraw', { p_amount: amount, p_payment_app: paymentApp ?? null });
  }
  /**
   * Leaving a group. A personal exit applies at once; a faulty-account claim
   * is queued for admin because it takes money off the seller.
   * Returns 'applied' or 'pending'.
   */
  async requestExit(input: {
    memberId: string;
    reason: 'personal' | 'faulty';
    note?: string;
    proof?: File;
  }): Promise<'applied' | 'pending'> {
    let proofUrl: string | undefined;

    if (input.proof) {
      const userId = await this.sb.currentUserId();
      const ext = input.proof.name.split('.').pop() ?? 'jpg';
      proofUrl = await this.sb.upload(
        'group-proofs',
        `exits/${userId}/${Date.now()}.${ext}`,
        input.proof,
      );
    }

    return this.sb.rpc<'applied' | 'pending'>('request_exit', {
      p_member: input.memberId,
      p_reason: input.reason,
      p_note: input.note ?? null,
      p_proof_url: proofUrl ?? null,
    });
  }

  async getExitRequests(): Promise<ExitRequest[]> {
    const { data, error } = await this.db
      .from('exit_requests')
      .select('*, profiles:buyer_id(name, unique_number), group_members(amount_paid, joined_on, expires_on, groups(price, ott_apps(title, brand), profiles!groups_seller_id_fkey(name, unique_number)))')
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data ?? []).map(r => {
      const m = r.group_members;
      const g = m?.groups;
      return {
        id: r.id,
        memberId: r.group_member_id,
        buyerName: r.profiles?.name ?? '',
        buyerUniqueNum: r.profiles?.unique_number ?? 0,
        sellerName: g?.profiles?.name ?? '',
        sellerUniqueNum: g?.profiles?.unique_number ?? 0,
        ottName: g?.ott_apps?.title ?? '',
        brand: g?.ott_apps?.brand ?? '',
        amountPaid: Number(m?.amount_paid ?? 0),
        joinedOn: m ? this.day(m.joined_on) : '',
        expiresOn: m ? this.day(m.expires_on) : '',
        reason: r.reason,
        note: r.note ?? undefined,
        proofUrl: r.proof_url ?? undefined,
        status: r.status,
        createdAt: this.day(r.created_at),
      };
    });
  }

  approveExitRequest(id: string) {
    return this.sb.rpc('approve_exit_request', { p_request: id });
  }

  rejectExitRequest(id: string, reason: string) {
    return this.sb.rpc('reject_exit_request', { p_request: id, p_reason: reason });
  }

  // ── Referrals ───────────────────────────────────────────────────────────
  myReferralCode() { return this.sb.rpc<string>('my_referral_code'); }
  redeemReferral(code: string) { return this.sb.rpc('redeem_referral', { p_code: code }); }

  async myReferralStats() {
    const me = await this.sb.currentUserId();
    if (!me) return { invited: 0, earned: 0 };
    const { data, error } = await this.db
      .from('referrals')
      .select('referred_id, reward_amount, rewarded')
      .eq('referrer_id', me);
    if (error) throw error;

    const rows = data ?? [];
    return {
      invited: rows.filter(r => r.referred_id).length,
      earned: rows.filter(r => r.rewarded).reduce((s, r) => s + Number(r.reward_amount), 0),
    };
  }
  approveAddFund(txId: string)  { return this.sb.rpc('approve_add_fund', { p_tx: txId }); }
  rejectAddFund(txId: string, reason: string)  { return this.sb.rpc('reject_add_fund', { p_tx: txId, p_reason: reason }); }
  approveWithdraw(txId: string) { return this.sb.rpc('approve_withdraw', { p_tx: txId }); }
  rejectWithdraw(txId: string, reason: string) { return this.sb.rpc('reject_withdraw', { p_tx: txId, p_reason: reason }); }

  /** Routes an approve/reject to the right RPC for the request kind. */
  async setTxStatus(id: string, status: 'cleared' | 'rejected', reason?: string) {
    const { data, error } = await this.db
      .from('wallet_transactions').select('tx_kind').eq('id', id).single();
    if (error) throw error;

    if (data.tx_kind === 'addfund') {
      return status === 'cleared' ? this.approveAddFund(id) : this.rejectAddFund(id, reason ?? '');
    }
    return status === 'cleared' ? this.approveWithdraw(id) : this.rejectWithdraw(id, reason ?? '');
  }

  // ══ Helpers ═════════════════════════════════════════════════════════════

  newId(prefix: string) { return prefix + '_' + Date.now().toString(36); }

  /** Client-side ids are placeholders; let Postgres generate the real uuid. */
  private idOrNull(id: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id) ? id : undefined;
  }

  private async upsert(table: string, row: Record<string, unknown>) {
    const clean: Record<string, unknown> = {};
    for (const key of Object.keys(row)) {
      if (row[key] !== undefined) clean[key] = row[key];
    }
    const { data, error } = await this.db.from(table).upsert(clean).select().single();
    if (error) throw error;
    return data;
  }

  private async del(table: string, id: string) {
    const { error } = await this.db.from(table).delete().eq('id', id);
    if (error) throw error;
  }

  private day(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
}