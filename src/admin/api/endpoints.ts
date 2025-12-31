/**
 * API 엔드포인트 상수 정의
 * 기존 index.html에서 사용하는 모든 엔드포인트를 여기에 정의
 */

export const API_ENDPOINTS = {
  // 인증
  AUTH: {
    LOGIN: '/auth/login',
    DEVELOPER_LOGIN: '/auth/developer-login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    ADMINS: '/auth/admins',
    PENDING_ADMINS: '/auth/pending-admins',
    APPROVE_ADMIN: '/auth/approve-admin',
    APPROVE_LEADER: '/auth/approve-leader',
    UPDATE_ROLE: (adminId: string) => `/auth/admins/${adminId}/role`,
    DELETE_ADMIN: (adminId: string) => `/auth/admins/${adminId}`,
  },

  // 사용자
  USERS: {
    LIST: '/users',
    DETAIL: (telegramId: number) => `/users/${telegramId}`,
    BLOCK: (telegramId: number) => `/users/${telegramId}/block`,
    UNBLOCK: (telegramId: number) => `/users/${telegramId}/unblock`,
    UPDATE_BALANCE: (telegramId: number) => `/users/${telegramId}/balance/admin`,
  },

  // 리더보드
  LEADERBOARD: {
    SCORE: '/leaderboard',
    CRYPTO: '/leaderboard/crypto',
    COINS: '/leaderboard/coins',
    RECORDS: '/leaderboard/records',
  },

  // 주간 목표
  WEEKLY_GOALS: {
    LIST: '/weekly-goals',
    CURRENT: '/weekly-goals/current',
    CREATE: '/weekly-goals',
    UPDATE: (id: string) => `/weekly-goals/${id}`,
    DELETE: (id: string) => `/weekly-goals/${id}`,
    ACHIEVERS: (id: string) => `/weekly-goals/${id}/achievers`,
    TOP_PLAYER: '/weekly-goals/top-player',
    TOP_PLAYERS: '/weekly-goals/top-players',
    ISSUE_PROMO_CODE: '/weekly-goals/issue-promo-code',
    ISSUE_PROMO_CODES_TO_TOP_PLAYERS: '/weekly-goals/issue-promo-codes-to-top-players',
  },

  // 프로모 코드
  PROMO_CODES: {
    LIST: '/promo-codes',
    CREATE: '/promo-codes/create',
    DELETE: (id: string) => `/promo-codes/${id}`,
  },

  // 프로모 코드 주문
  PROMO_CODE_REQUESTS: {
    LIST: '/promo-code-requests',
    APPROVE: (id: string) => `/promo-code-requests/${id}/approve`,
    REJECT: (id: string) => `/promo-code-requests/${id}/reject`,
  },

  // 휠 설정
  WHEEL_CONFIGS: {
    LIST: '/wheel-configs',
    DEFAULT: '/wheel-configs/default',
    UPDATE: (id: string) => `/wheel-configs/${id}`,
  },

  // 상점
  SHOP_ITEMS: {
    LIST: '/shop-items',
    UPDATE: (id: string) => `/shop-items/${id}`,
  },

  // 텔레그램 봇
  TELEGRAM_BOT: {
    STATUS: '/telegram-bot/status',
    BROADCAST: '/telegram-bot/broadcast',
  },

  // 봇 설정
  BOT_CONFIG: {
    GET: '/bot-config',
    SAVE: '/bot-config',
    TOGGLE_ACTIVE: '/bot-config/toggle-active',
    REQUIRED_CHANNELS: '/bot-config/required-channels',
  },

  // 관리자
  ADMIN: {
    REQUIRED_CHANNELS: '/admin/required-channels',
    STATS: '/admin/stats',
    GRAPH_DATA: '/admin/graph-data',
    RESET_DATABASE: '/admin/reset-database',
    RESET_PROGRESS: '/admin/reset-progress',
    RESET_SCORES: '/admin/reset-scores',
  },
  
  // 채널 관리
  CHANNELS: {
    REQUIRED: '/admin/required-channels',
  },

  // 게임 설정
  GAME_CONFIG: {
    AD_IMAGE: '/game-config/ad-image',
    AD_IMAGE_UPLOAD: '/game-config/ad-image/upload',
    AD_IMAGE_RESET: '/game-config/ad-image/reset',
    AD_IMAGE_DATA: '/game-config/ad-image/data',
  },
} as const;

