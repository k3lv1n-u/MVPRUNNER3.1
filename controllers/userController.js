const User = require('../models/User');
const GameRecord = require('../models/GameRecord');
const BotConfig = require('../models/BotConfig');
const { Telegraf } = require('telegraf');
const { authenticate, requireLeader } = require('../utils/auth');

// 사용자 생성 또는 업데이트
exports.createOrUpdateUser = async (req, res) => {
  try {
    const { telegramId, username, firstName, lastName, avatar } = req.body;

    if (!telegramId) {
      return res.status(400).json({ error: 'Telegram ID is required' });
    }

    // 블록된 사용자 체크
    const existingUser = await User.findOne({ telegramId });
    if (existingUser && existingUser.isBlocked) {
      return res.status(403).json({
        error: 'Account is blocked',
        isBlocked: true,
        blockReason: existingUser.blockReason
      });
    }

    // IP 및 기기정보 수집
    const clientIp = req.clientIp || req.ip || 'unknown';
    const deviceInfo = req.deviceInfo || {
      userAgent: req.headers['user-agent'] || 'unknown',
      platform: 'unknown',
      language: req.headers['accept-language']?.split(',')[0] || 'unknown'
    };

    const updateData = {
      username: username || 'username',
      firstName,
      lastName,
      avatar,
      lastIpAddress: clientIp,
      lastLoginAt: Date.now(),
      updatedAt: Date.now()
    };

    // 신규 사용자인 경우 IP 및 기기정보 저장
    if (!existingUser) {
      updateData.ipAddress = clientIp;
      updateData.deviceInfo = deviceInfo;
    } else {
      // 기존 사용자의 경우 IP가 변경되었으면 업데이트
      if (existingUser.ipAddress !== clientIp) {
        updateData.ipAddress = clientIp;
      }
      // 기기정보 업데이트
      updateData.deviceInfo = deviceInfo;
    }

    // Referral Code 생성 (없는 경우)
    if (!existingUser || !existingUser.referralCode) {
      if (typeof userSchema?.methods?.generateReferralCode === 'function') {
        // 스키마 메서드 사용 불가 시 직접 생성
      }
      // 직접 생성 로직
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      updateData.referralCode = code;
    }

    const user = await User.findOneAndUpdate(
      { telegramId },
      updateData,
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      user: {
        id: user._id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        balance: user.balance,
        highScore: user.highScore,
        totalGames: user.totalGames,
        isBlocked: user.isBlocked,
        referralCode: user.referralCode
      }
    });
  } catch (error) {
    console.error('Error creating/updating user:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 사용자 정보 가져오기
exports.getUser = async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { includeSecurity = false } = req.query; // 관리자용 보안 정보 포함 여부

    const user = await User.findOne({ telegramId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Referral Code가 없으면 생성
    if (!user.referralCode) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      user.referralCode = code;
      await user.save();
    }

    // 봇 설정 가져오기 (유저네임 포함)
    let botConfig = await BotConfig.getConfig();

    // 봇 유저네임이 없으면 실시간으로 가져오기 시도
    if (!botConfig.botUsername && botConfig.botToken) {
      try {
        const tempBot = new Telegraf(botConfig.botToken);
        const botInfo = await tempBot.telegram.getMe();
        if (botInfo && botInfo.username) {
          botConfig = await BotConfig.updateConfig({ botUsername: botInfo.username });
          console.log('[UserController] Bot username fetched and saved:', botInfo.username);
        }
      } catch (error) {
        console.error('[UserController] Failed to fetch bot username:', error.message);
      }
    }

    const userData = {
      id: user._id,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      balance: user.balance,
      highScore: user.highScore,
      totalGames: user.totalGames,
      referralCode: user.referralCode,
      botUsername: botConfig.botUsername, // 봇 유저네임 추가
      totalScore: user.totalScore,
      lastPlayed: user.lastPlayed,
      isBlocked: user.isBlocked
    };

    // 관리자용 보안 정보 포함
    if (includeSecurity === 'true') {
      userData.ipAddress = user.ipAddress;
      userData.lastIpAddress = user.lastIpAddress;
      userData.deviceInfo = user.deviceInfo;
      userData.lastLoginAt = user.lastLoginAt;
      userData.blockedAt = user.blockedAt;
      userData.blockReason = user.blockReason;
      userData.createdAt = user.createdAt;
    }

    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 관리자용 잔액 업데이트 (LEADER, DEVELOPER만 접근 가능)
exports.updateBalanceByAdmin = async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { balance, operation, reason } = req.body; // operation: 'add', 'subtract', 'set'

    if (!telegramId || balance === undefined) {
      return res.status(400).json({ 
        success: false,
        error: 'Telegram ID and balance are required' 
      });
    }

    if (!operation || !['add', 'subtract', 'set'].includes(operation)) {
      return res.status(400).json({ 
        success: false,
        error: 'Operation must be one of: add, subtract, set' 
      });
    }

    const user = await User.findOne({ telegramId: parseInt(telegramId) });

    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }

    const oldBalance = user.balance;
    let newBalance = oldBalance;

    if (operation === 'add') {
      newBalance = oldBalance + parseFloat(balance);
    } else if (operation === 'subtract') {
      newBalance = Math.max(0, oldBalance - parseFloat(balance));
    } else if (operation === 'set') {
      newBalance = Math.max(0, parseFloat(balance));
    }

    user.balance = newBalance;
    await user.save();

    const adminRole = req.user?.role || 'UNKNOWN';
    const adminUsername = req.user?.username || 'DEVELOPER';
    
    console.log(`[BalanceUpdate] Admin update: User ${telegramId}, Admin: ${adminRole} (${adminUsername}), Operation: ${operation}, Amount: ${balance}, Old Balance: ${oldBalance}, New Balance: ${newBalance}, Reason: ${reason || 'N/A'}`);

    res.json({
      success: true,
      message: 'Balance updated successfully',
      balance: {
        old: oldBalance,
        new: newBalance,
        change: newBalance - oldBalance
      },
      user: {
        telegramId: user.telegramId,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Error updating balance by admin:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server error' 
    });
  }
};

// 잔액 업데이트 (서버 내부에서만 사용)
// 외부 요청은 차단하고, 내부 서버 로직에서만 호출 가능
exports.updateBalance = async (req, res) => {
  try {
    // 서버 내부 요청인지 확인
    // 내부 요청은 특별한 헤더나 토큰으로 구분
    const internalToken = req.headers['x-internal-token'];
    const isInternalRequest = internalToken === process.env.INTERNAL_API_TOKEN || 
                             req.headers['x-forwarded-for'] === undefined || // 직접 연결 (로컬)
                             req.headers['x-internal-request'] === 'true';
    
    // 외부 요청 차단
    if (!isInternalRequest) {
      console.warn(`[Security] External request to updateBalance blocked from IP: ${req.clientIp || req.ip}`);
      return res.status(403).json({ 
        error: 'This endpoint is for internal use only',
        success: false
      });
    }

    const { telegramId } = req.params;
    const { balance, operation } = req.body; // operation: 'add', 'subtract', 'set'

    if (!telegramId || balance === undefined) {
      return res.status(400).json({ error: 'Telegram ID and balance are required' });
    }

    const user = await User.findOne({ telegramId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let newBalance = user.balance;
    if (operation === 'add') {
      newBalance = user.balance + balance;
    } else if (operation === 'subtract') {
      newBalance = Math.max(0, user.balance - balance);
    } else {
      newBalance = balance;
    }

    user.balance = newBalance;
    await user.save();

    console.log(`[BalanceUpdate] Internal update: User ${telegramId}, Operation: ${operation}, Amount: ${balance}, New Balance: ${newBalance}`);

    res.json({
      success: true,
      balance: user.balance
    });
  } catch (error) {
    console.error('Error updating balance:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 모든 사용자 가져오기 (관리자용) - 페이지네이션 및 검색 지원
exports.getAllUsers = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 50,
      sortBy = 'highScore',
      order = 'desc',
      includeSecurity = true,
      search = '' // Telegram ID 또는 username 검색
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;

    const sortOptions = {};
    sortOptions[sortBy] = order === 'desc' ? -1 : 1;

    // 검색 필터 구성 (이름 기반 검색: username, firstName, lastName)
    const filter = {};
    if (search && typeof search === 'string') {
      const trimmed = search.trim();
      if (trimmed) {
        // username, firstName, lastName 중 하나라도 일치하면 검색
        filter.$or = [
          { username: { $regex: trimmed, $options: 'i' } },
          { firstName: { $regex: trimmed, $options: 'i' } },
          { lastName: { $regex: trimmed, $options: 'i' } }
        ];
      }
    }

    const query = User.find(filter)
      .sort(sortOptions)
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .select(includeSecurity === 'false' ? '-ipAddress -deviceInfo -lastIpAddress -lastLoginAt' : '-__v');

    const [users, total] = await Promise.all([
      query.exec(),
      User.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limitNum) || 1;

    res.json({
      success: true,
      users,
      totalPages,
      currentPage: pageNum,
      total,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 계정 블록/해제
exports.blockUser = async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { blockReason } = req.body;

    const user = await User.findOne({ telegramId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isBlocked = true;
    user.blockedAt = Date.now();
    user.blockReason = blockReason || 'Blocked by administrator';
    await user.save();

    res.json({
      success: true,
      message: 'User blocked successfully',
      user: {
        telegramId: user.telegramId,
        username: user.username,
        isBlocked: user.isBlocked,
        blockedAt: user.blockedAt,
        blockReason: user.blockReason
      }
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 계정 블록 해제
exports.unblockUser = async (req, res) => {
  try {
    const { telegramId } = req.params;

    const user = await User.findOne({ telegramId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isBlocked = false;
    user.blockedAt = null;
    user.blockReason = null;
    await user.save();

    res.json({
      success: true,
      message: 'User unblocked successfully',
      user: {
        telegramId: user.telegramId,
        username: user.username,
        isBlocked: user.isBlocked
      }
    });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 사용자 통계 가져오기
exports.getUserStats = async (req, res) => {
  try {
    const { telegramId } = req.params;

    const user = await User.findOne({ telegramId });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const recentGames = await GameRecord.find({ telegramId })
      .sort({ playedAt: -1 })
      .limit(10)
      .select('score playedAt isNewRecord');

    const totalGames = await GameRecord.countDocuments({ telegramId });

    res.json({
      success: true,
      stats: {
        highScore: user.highScore,
        balance: user.balance,
        totalGames,
        recentGames,
        averageScore: totalGames > 0 ? user.totalScore / totalGames : 0
      }
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
};


