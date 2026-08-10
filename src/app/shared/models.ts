// Domain models for ShareOTT's.
//
// These mirror the tables planned in Supabase. Every CMS-editable entity
// carries the fields the admin panel edits (title / subName / color / icon /
// imageUrl / position / active) so the admin editor sheet can be reused
// across categories, OTT apps, validity plans, home buttons and so on.

export type Role = 'user' | 'admin';

// These must stay in step with the Postgres enums in 0001_schema.sql.
export type TxType = 'funded' | 'expense';
export type TxKind =
  | 'addfund' | 'withdraw' | 'purchase' | 'sale'
  | 'refund' | 'penalty' | 'service_fee';
export type TxStatus = 'pending' | 'cleared' | 'rejected';

export type GroupStatus = 'pending' | 'approved' | 'rejected' | 'full' | 'expired';
export type MemberStatus = 'active' | 'expiring' | 'expired' | 'exited';
export type ExitReason = 'personal' | 'faulty';

export type LangCode = 'en' | 'hi' | 'te';

/** Anything the admin can create/edit/reorder through the shared editor sheet. */
export interface CmsEntity {
  id: string;
  title: string;
  subName?: string;
  color: string;
  icon: string;
  imageUrl?: string;
  position: number;
  active: boolean;
}

// ── Catalog ───────────────────────────────────────────────────────────────

export interface Category extends CmsEntity {
  appCount?: number;
}

export interface ValidityPlan extends CmsEntity {
  months: number;
  amount: number;
  saveUpto: number;
}

export interface OttPlanTier {
  id: string;
  label: string;        // 'Premium', 'HD + Sports'
  maxScreens: number;   // seat limit, set by admin
}

/** An OTT platform. `brand` drives the approximated logo component. */
export interface OttApp extends CmsEntity {
  categoryId: string;
  brand: string;        // 'netflix' | 'prime' | … — logo lookup key
  tiers: OttPlanTier[];
  sellers: number;
  startingPrice: number;
  available: number;
}

// ── People ────────────────────────────────────────────────────────────────

export interface BankDetails {
  holderName: string;
  upiId: string;
  accountNo: string;
  ifsc: string;
  locked: boolean;      // set once at signup, then immutable
}

export interface Badge {
  id: string;
  label: string;
  emoji: string;
  color: string;
}

export interface AppUser {
  id: string;
  name: string;
  nickName: string;
  uniqueNumber: number;
  mobile: string;
  email: string;
  role: Role;
  isSeller: boolean;
  avatarUrl?: string;
  registeredDate: string;
  mobileVerified: boolean;
  emailVerified: boolean;
  rating: number;
  reviewCount: number;
  badges: Badge[];
  bank?: BankDetails;
  walletAmount: number;
  lockedAmount: number;
  unlockedAmount: number;
  groupsJoined: number;
  groupsCreated: number;
  txCount: number;
  isOnline: boolean;
}

// ── Money ─────────────────────────────────────────────────────────────────

export interface WalletTx {
  id: string;
  userId: string;
  txType: TxType;
  txKind: TxKind;
  status: TxStatus;
  amount: number;
  txDate: string;
  txTime: string;
  txnRef?: string;
  screenshotUrl?: string;
  // OTT context (purchase / sale rows)
  ottId?: string;
  ottName?: string;
  brand?: string;
  tierLabel?: string;
  dateFrom?: string;
  dateTo?: string;
  months?: number;
  // Money-movement context (add fund / withdraw rows)
  partyName?: string;
  partyUniqueNum?: number;
  partyMobile?: string;
  paymentApp?: string;   // 'PhonePe' | 'GPay' | …
  rejectReason?: string;
}

export interface WalletSummary {
  userId: string;
  name: string;
  uniqueNumber: number;
  avatarUrl?: string;
  total: number;
  locked: number;
  unlocked: number;
  withdrawCount: number;
  withdrawDeclined: number;
  withdrawSuccess: number;
  fundsAdded: number;
  net: number;
}

// ── Groups ────────────────────────────────────────────────────────────────

export interface GroupScreen {
  id: string;
  ottId: string;
  ottName: string;
  brand: string;
  tierLabel: string;
  months: number;
  dateFrom: string;
  dateTo: string;
  seatsTotal: number;
  seatsFilled: number;
  status: GroupStatus;
  proofUrl?: string;
  comment?: string;
  price: number;
  // seller side
  sellerId: string;
  sellerName: string;
  sellerUniqueNum: number;
  sellerAvatarUrl?: string;
  // buyer side
  memberStatus?: MemberStatus;
  amountPaid?: number;
  flags?: string[];      // 'Incorrect Details' | 'Pending Details'
}

// ── Chat ──────────────────────────────────────────────────────────────────

export interface ChatThread {
  id: string;
  isGroup: boolean;
  peerName?: string;
  peerUniqueNum?: number;
  peerAvatarUrl?: string;
  ottName?: string;
  brand?: string;
  tierLabel?: string;
  months?: number;
  sellerName?: string;
  sellerUniqueNum?: number;
  rating?: number;
  reviewCount?: number;
  badges?: Badge[];
  lastMessage: string;
  lastTime: string;
  unread: number;
  isOnline: boolean;
  locked: boolean;
  /** Q5 — photos and voice need both sides unlocked. Resets when chat closes. */
  buyerMediaUnlocked: boolean;
  sellerMediaUnlocked: boolean;
  iAmBuyer: boolean;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  text?: string;
  imageUrl?: string;
  isMine: boolean;
  time: string;
}

// ── Content ───────────────────────────────────────────────────────────────

export type Localized = Record<LangCode, string>;

export interface FaqItem {
  id: string;
  q: Localized;
  a: Localized;
  videoUrl?: Localized;
  position: number;
  open?: boolean;
}

export interface FormField {
  id: string;
  label: string;
  placeholder: string;
  icon: string;
  iconBg: string;
  type: 'text' | 'tel' | 'email' | 'password';
  required: boolean;
  enabled: boolean;
  requireOtp: boolean;
  otpCapable: boolean;
  position: number;
}

export interface HomeButton extends CmsEntity {
  iconPosition: 'left' | 'top' | 'right';
  route: string;
}

export interface PaymentConfig {
  qrImageUrl?: string;
  name: string;
  upiId: string;
  upiMobile: string;
  bankName: string;
  bankMasked: string;
}

export interface SocialLink extends CmsEntity {
  url: string;
}

/** A buyer leaving early. Faulty-account claims wait for admin review. */
export interface ExitRequest {
  id: string;
  memberId: string;
  buyerName: string;
  buyerUniqueNum: number;
  sellerName: string;
  sellerUniqueNum: number;
  ottName: string;
  brand: string;
  amountPaid: number;
  joinedOn: string;
  expiresOn: string;
  reason: ExitReason;
  note?: string;
  proofUrl?: string;
  status: TxStatus;
  createdAt: string;
}

/** A pending change to someone's payout destination. Admin must approve (Q4). */
export interface BankChangeRequest {
  id: string;
  userId: string;
  userName: string;
  userUniqueNum: number;
  userMobile: string;
  holderName: string;
  upiId: string;
  accountNo: string;
  ifsc: string;
  status: TxStatus;
  rejectReason?: string;
  createdAt: string;
}

export interface NotificationRule {
  key: string;
  title: string;
  bodyTemplate: string;
  enabled: boolean;
  /** Days before expiry. Null for event-driven alerts. */
  offsetDays: number | null;
}

export interface Referral {
  id: string;
  code: string;
  referrerId: string;
  referrerName: string;
  referredId?: string;
  referredName?: string;
  rewardAmount: number;
  rewarded: boolean;
  createdAt: string;
}

/** The Purchase / Share cards shown after picking a platform. */
export interface CommerceOption extends CmsEntity {
  action: 'purchase' | 'share';
}

export interface UserRating {
  id: string;
  userId: string;
  userName: string;
  userUniqueNum: number;
  stars: number;
  text: string;
  date: string;
  ottName?: string;
  brand?: string;
}

/** A badge ("batch") granted to a user after a completed deal. */
export interface BadgeAward {
  id: string;
  userId: string;
  userName: string;
  userUniqueNum: number;
  label: string;
  emoji: string;
  positive: boolean;
  date: string;
  ottName?: string;
  brand?: string;
}