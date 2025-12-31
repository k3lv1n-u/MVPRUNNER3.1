// API 서비스 - 서버와의 통신을 담당
// 개발 모드: 직접 백엔드 서버로 요청
// 프로덕션: 같은 서버에서 서빙되므로 상대 경로 사용
// Vercel 배포 시: 현재 도메인의 /api 사용
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  if (process.env.NODE_ENV === 'production') {
    // 프로덕션에서는 상대 경로 사용 (같은 도메인)
    return '/api';
  }
  // 개발 모드
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();

class ApiService {
  constructor() {
    this.accountBlocked = false;
  }

  // 계정 차단 상태 설정
  setAccountBlocked(blocked) {
    this.accountBlocked = blocked;
  }

  // 모든 API 요청 전에 차단 상태 확인
  async makeRequest(url, options = {}) {
    if (this.accountBlocked) {
      console.warn('[API] Request blocked - account is blocked:', url);
      throw new Error('Аккаунт заблокирован. Все запросы отклонены.');
    }
    return fetch(url, options);
  }
  // 사용자 생성 또는 업데이트
  async createOrUpdateUser(telegramId, userData) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId,
          ...userData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create/update user');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw error;
    }
  }

  // 사용자 정보 가져오기
  async getUser(telegramId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/users/${telegramId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null; // 사용자가 없음
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get user');
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  // 사용자 잔액 업데이트
  async updateBalance(telegramId, amount, operation = 'add') {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/users/${telegramId}/balance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ balance: amount, operation }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update balance');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating balance:', error);
      throw error;
    }
  }

  // 게임 기록 저장
  async saveGameRecord(telegramId, gameData) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/leaderboard/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId,
          ...gameData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save game record');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error saving game record:', error);
      throw error;
    }
  }

  // 리더보드 가져오기 (전체)
  async getLeaderboard(limit = 50, page = 1) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/leaderboard?limit=${limit}&page=${page}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get leaderboard');
      }

      const data = await response.json();
      return {
        leaderboard: data.leaderboard || [],
        pagination: data.pagination || null
      };
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }

  // 주간 리더보드 가져오기
  async getWeeklyLeaderboard(limit = 100, offset = 0) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/leaderboard/weekly?limit=${limit}&offset=${offset}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get weekly leaderboard');
      }

      const data = await response.json();
      return {
        leaderboard: data.leaderboard || [],
        weekInfo: data.weekInfo
      };
    } catch (error) {
      console.error('Error getting weekly leaderboard:', error);
      throw error;
    }
  }

  // 사용자 순위 가져오기
  async getUserRank(telegramId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/leaderboard/rank/${telegramId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get user rank');
      }

      const data = await response.json();
      return data.rank;
    } catch (error) {
      console.error('Error getting user rank:', error);
      throw error;
    }
  }

  // 사용자 통계 가져오기
  async getUserStats(telegramId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/users/${telegramId}/stats`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get user stats');
      }

      const data = await response.json();
      return data.stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  // 서버 상태 확인
  async checkServerHealth() {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/api/health`);
      if (!response.ok) {
        return false;
      }
      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Error checking server health:', error);
      return false;
    }
  }

  // 현재 주간 목표 가져오기
  async getCurrentWeeklyGoal() {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/weekly-goals/current`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get weekly goal');
      }

      const data = await response.json();
      return data.goal;
    } catch (error) {
      console.error('Error getting weekly goal:', error);
      throw error;
    }
  }

  // 프로모션 코드 검증
  async verifyPromoCode(telegramId, code) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/promo-codes/${telegramId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify promo code');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error verifying promo code:', error);
      throw error;
    }
  }

  // 프로모션 코드 사용
  async usePromoCode(telegramId, code) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/promo-codes/${telegramId}/use`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to use promo code');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error using promo code:', error);
      throw error;
    }
  }

  // 사용자의 프로모션 코드 가져오기
  async getUserPromoCodes(telegramId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/promo-codes/${telegramId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get promo codes');
      }

      const data = await response.json();
      return data.codes || [];
    } catch (error) {
      console.error('Error getting promo codes:', error);
      throw error;
    }
  }

  // 새로운 프로모션 코드 확인 (관리자가 발급한 코드)
  async checkNewPromoCode(telegramId) {
    try {
      // PromoCodeRequest에서 승인된 요청 확인
      const requests = await this.getUserPromoCodeRequests(telegramId);
      const issuedRequest = requests.find(
        (req) => req.status === 'issued' && req.promoCodeId
      );

      if (issuedRequest && issuedRequest.promoCodeId) {
        // 프로모션 코드 정보 가져오기
        const codes = await this.getUserPromoCodes(telegramId);
        const newCode = codes.find((code) => code._id === issuedRequest.promoCodeId && !code.isUsed);

        if (newCode) {
          return newCode;
        }
      }

      return null;
    } catch (error) {
      console.error('Error checking new promo code:', error);
      return null;
    }
  }

  // 활성 휠 설정 가져오기
  async getActiveWheelConfig() {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/wheel-configs/active`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get wheel config');
      }

      const data = await response.json();
      return data.config;
    } catch (error) {
      console.error('Error getting wheel config:', error);
      throw error;
    }
  }

  // 기본 휠 설정 가져오기
  async getDefaultWheelConfig() {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/wheel-configs/default`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get default wheel config');
      }

      const data = await response.json();
      return data.config;
    } catch (error) {
      console.error('Error getting default wheel config:', error);
      throw error;
    }
  }

  // 활성 상점 아이템 가져오기
  async getActiveShopItems() {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/shop-items/active`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get shop items');
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error getting shop items:', error);
      throw error;
    }
  }

  // 구매 가능한 프로모션 코드 가져오기
  async getPurchasablePromoCodes() {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/promo-codes/shop/purchasable`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get purchasable promo codes');
      }

      const data = await response.json();
      return data.codes || [];
    } catch (error) {
      console.error('Error getting purchasable promo codes:', error);
      throw error;
    }
  }

  // 프로모션 코드 구매
  async purchasePromoCode(telegramId, itemId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/promo-codes/${telegramId}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to purchase promo code');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error purchasing promo code:', error);
      throw error;
    }
  }

  // 사용자의 프로모션 코드 요청 가져오기
  async getUserPromoCodeRequests(telegramId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/promo-code-requests/user/${telegramId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get promo code requests');
      }

      const data = await response.json();
      return data.requests || [];
    } catch (error) {
      console.error('Error getting promo code requests:', error);
      throw error;
    }
  }

  // 휠 돌리기 (서버에서 결과 계산)
  async spinWheel(telegramId, promoCode) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/wheel/spin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId,
          promoCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to spin wheel');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error spinning wheel:', error);
      throw error;
    }
  }

  // 에뮬레이터 fingerprint 검증
  async checkEmulatorFingerprint(telegramId, fingerprint) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/security/emulator-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramId,
          fingerprint
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check emulator');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error checking emulator fingerprint:', error);
      throw error;
    }
  }

  // 암호화폐 리더보드 가져오기
  async getCryptoLeaderboard(limit = 50, page = 1) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/leaderboard/crypto?limit=${limit}&page=${page}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get crypto leaderboard');
      }

      const data = await response.json();
      return {
        leaderboard: data.leaderboard || [],
        pagination: data.pagination || null
      };
    } catch (error) {
      console.error('Error getting crypto leaderboard:', error);
      throw error;
    }
  }

  // 게임 코인 리더보드 가져오기
  async getCoinLeaderboard(limit = 50, page = 1) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/leaderboard/coins?limit=${limit}&page=${page}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get coin leaderboard');
      }

      const data = await response.json();
      return {
        leaderboard: data.leaderboard || [],
        pagination: data.pagination || null
      };
    } catch (error) {
      console.error('Error getting coin leaderboard:', error);
      throw error;
    }
  }

  /**
   * 필수 채널 목록 가져오기
   * 
   * @returns {Promise<Object>} - { success, channels }
   */
  async getRequiredChannels() {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/channel/required-channels`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[API] Error getting required channels:', error);
      throw error;
    }
  }

  /**
   * 채널 가입 여부 확인 (서버 측 검증)
   * 
   * @param {string} initData - Telegram WebApp initData 전체 문자열
   * @returns {Promise<Object>} - { success, allSubscribed, channels, userId }
   */
  async checkChannelSubscription(initData) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/channel/check-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ initData }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[API] Error checking channel subscription:', error);
      throw error;
    }
  }

  // ========== NOTIFICATION API ==========
  // 알림 목록 가져오기
  async getNotifications(userId, limit = 50, skip = 0) {
    try {
      const response = await this.makeRequest(
        `${API_BASE_URL}/notifications/${userId}?limit=${limit}&skip=${skip}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get notifications');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }

  // 알림 읽음 표시
  async markNotificationAsRead(notificationId) {
    try {
      const response = await this.makeRequest(
        `${API_BASE_URL}/notifications/${notificationId}/read`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark as read');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // 모든 알림 읽음 표시
  async markAllNotificationsAsRead(userId) {
    try {
      const response = await this.makeRequest(
        `${API_BASE_URL}/notifications/${userId}/read-all`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark all as read');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  }

  // 보상 수령
  async claimNotificationReward(notificationId) {
    try {
      const response = await this.makeRequest(
        `${API_BASE_URL}/notifications/${notificationId}/claim`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to claim reward');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error claiming reward:', error);
      throw error;
    }
  }
  // ========== END NOTIFICATION API ==========

  // 아이템 구매
  async purchaseItem(telegramId, itemId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/items/${telegramId}/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to purchase item');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error purchasing item:', error);
      throw error;
    }
  }

  // 사용자 인벤토리 조회
  async getUserInventory(telegramId) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/items/${telegramId}/inventory`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get inventory');
      }

      const data = await response.json();
      return data.inventory;
    } catch (error) {
      console.error('Error getting inventory:', error);
      throw error;
    }
  }

  // 아이템 사용
  async useItem(telegramId, itemKey) {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/items/${telegramId}/use`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemKey }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to use item');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error using item:', error);
      throw error;
    }
  }

  // 광고 이미지 정보 가져오기 (데이터베이스에서)
  async getAdImage() {
    try {
      const response = await this.makeRequest(`${API_BASE_URL}/game-config/ad-image`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get ad image');
      }

      const data = await response.json();
      return {
        adImagePath: data.adImagePath || '/gyrocop.png',
        hasImageData: data.hasImageData || false,
        adImageData: data.adImageData,
        adImageMimeType: data.adImageMimeType
      };
    } catch (error) {
      console.error('Error getting ad image:', error);
      // 에러 발생 시 기본값 반환
      return {
        adImagePath: '/gyrocop.png',
        hasImageData: false
      };
    }
  }
}

const apiService = new ApiService();
export default apiService;
