/**
 * TypeScript 타입 정의
 * 기존 index.html에서 사용하는 데이터 구조를 타입으로 정의
 */

export interface User {
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  balance: number;
  highScore: number;
  totalGames: number;
  totalScore?: number;
  ipAddress?: string;
  lastIpAddress?: string;
  deviceInfo?: {
    platform?: string;
    language?: string;
    userAgent?: string;
  };
  isBlocked: boolean;
  blockReason?: string;
  createdAt: string;
  lastLoginAt?: string;
  lastPlayed?: string;
}

export interface LeaderboardEntry {
  rank: number;
  telegramId: number;
  username?: string;
  highScore: number;
  balance: number;
  totalGames: number;
  totalCryptoEarned?: number;
}

export interface GameRecord {
  telegramId: number;
  userId?: User;
  score: number;
  isNewRecord: boolean;
  playedAt: string;
}

export interface WeeklyGoal {
  _id: string;
  weekStartDate: string;
  weekEndDate: string;
  targetScore: number;
  description?: string;
  isActive: boolean;
}

export interface GoalAchiever {
  rank: number;
  telegramId: number;
  username: string;
  score: number;
  playedAt: string;
  hasPromoCode: boolean;
}

export interface PromoCode {
  _id: string;
  code: string;
  telegramId?: number;
  username?: string;
  isPurchasable: boolean;
  price?: number;
  stock?: number;
  soldCount?: number;
  isUsed: boolean;
  wheelConfigId?: string;
  weeklyGoalId?: string;
}

export interface PromoCodeRequest {
  _id: string;
  type: 'weekly-goal' | 'shop-purchase';
  telegramId: number;
  userId?: User;
  status: 'pending' | 'approved' | 'issued' | 'rejected';
  targetScore?: number;
  actualScore?: number;
  shopItemId?: {
    name: string;
  };
  shopPurchasePrice?: number;
  promoCodeId?: {
    code: string;
  };
  requestedAt: string;
  adminNote?: string;
}

export interface WheelSegment {
  value: number;
  label: string;
  color?: string;
  gradient?: string[];
}

export interface WheelConfig {
  _id: string;
  name: string;
  segments: WheelSegment[];
  isActive: boolean;
  isDefault: boolean;
}

export interface ShopItem {
  _id: string;
  name: string;
  type: 'promo-code' | 'item';
  description?: string;
  price: number;
  stock: number;
  isActive: boolean;
  itemKey?: string;
  wheelConfigId?: string;
  autoIssue?: boolean;
}

export interface BotStatus {
  isInitialized: boolean;
  isPolling: boolean;
  isWebhookActive: boolean;
  isActive: boolean;
  webhookUrl?: string;
  webhookPendingUpdates?: number;
  miniAppUrl?: string;
  hasToken: boolean;
}

export interface BotConfig {
  hasToken: boolean;
  isActive: boolean;
  miniAppUrl?: string;
  notificationChannelId?: string;
}

export interface RequiredChannel {
  title: string;
  url: string;
  chatId?: number | null;
  accessHash?: string;
}

export interface Admin {
  id: string;
  username?: string;
  role: 'DEVELOPER' | 'LEADER' | 'ADMIN';
  status: 'PENDING' | 'APPROVED';
  approvedBy?: {
    username: string;
    role: string;
  };
  approvedAt?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Stats {
  users?: number;
  gameRecords?: number;
  promoCodes?: number;
  usedPromoCodes?: number;
  unusedPromoCodes?: number;
  highestScore?: number;
  highestScoreUser?: string | null;
  currentWeeklyGoalTarget?: number;
  currentWeeklyGoalDesc?: string | null;
}

export interface GraphData {
  userRegistrations?: Array<{ date: string; count: number }>;
  gamePlays?: Array<{ date: string; count: number }>;
  scoreDistribution?: Array<{ label: string; count: number }>;
  cumulativePlayers?: Array<{ date: string; count: number }>;
}

export interface AdImageInfo {
  adImagePath: string;
  hasImageData: boolean;
  version: number;
}

