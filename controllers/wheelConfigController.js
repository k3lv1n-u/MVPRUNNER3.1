const WheelConfig = require('../models/WheelConfig');

// 활성화된 휠 설정 가져오기 (게임용)
exports.getActiveConfig = async (req, res) => {
  try {
    const config = await WheelConfig.getActive();

    if (!config) {
      return res.status(404).json({ 
        error: 'No active wheel configuration found',
        success: false
      });
    }

    res.json({
      success: true,
      config: {
        id: config._id,
        name: config.name,
        segments: config.segments,
        isDefault: config.isDefault
      }
    });
  } catch (error) {
    console.error('Error getting active wheel config:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 기본 휠 설정 가져오기 (관리자용, 기본값 생성 포함)
exports.getDefaultConfig = async (req, res) => {
  try {
    const config = await WheelConfig.getActive();

    if (!config) {
      // 기본 설정이 없으면 기본값 생성
      const defaultConfig = new WheelConfig({
        name: 'default',
        isDefault: true,
        isActive: true,
        segments: [
          { value: 100, label: '100 USDT', color: '#1a1a1a', gradient: ['#0f0f0f', '#222222'] },
          { value: 250, label: '250 USDT', color: '#1f1f1f', gradient: ['#141414', '#2a2a2a'] },
          { value: 500, label: '500 USDT', color: '#242424', gradient: ['#191919', '#2f2f2f'] },
          { value: 1000, label: '1000 USDT', color: '#292929', gradient: ['#1e1e1e', '#343434'] },
          { value: 1000, label: '1000 USDT', color: '#2e2e2e', gradient: ['#232323', '#393939'] },
          { value: 100, label: '100 USDT', color: '#1a1a1a', gradient: ['#0f0f0f', '#222222'] },
          { value: 100, label: '100 USDT', color: '#1f1f1f', gradient: ['#141414', '#2a2a2a'] },
          { value: 25, label: '25 USDT', color: '#1a1a1a', gradient: ['#0f0f0f', '#222222'] }
        ]
      });
      await defaultConfig.save();
      return res.json({
        success: true,
        config: {
          id: defaultConfig._id,
          name: defaultConfig.name,
          segments: defaultConfig.segments,
          isDefault: defaultConfig.isDefault
        }
      });
    }

    res.json({
      success: true,
      config: {
        id: config._id,
        name: config.name,
        segments: config.segments,
        isDefault: config.isDefault
      }
    });
  } catch (error) {
    console.error('Error getting default wheel config:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 모든 휠 설정 가져오기
exports.getAllConfigs = async (req, res) => {
  try {
    const configs = await WheelConfig.find()
      .sort({ isDefault: -1, createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      configs
    });
  } catch (error) {
    console.error('Error getting all wheel configs:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 휠 설정 생성
exports.createConfig = async (req, res) => {
  try {
    const { name, segments, isDefault, isActive, description } = req.body;

    if (!name || !segments || !Array.isArray(segments) || segments.length < 4 || segments.length > 16) {
      return res.status(400).json({ 
        error: 'Name and segments (4-16) are required' 
      });
    }

    // 기본 설정인 경우 기존 기본 설정 해제
    if (isDefault) {
      await WheelConfig.updateMany(
        { isDefault: true },
        { isDefault: false }
      );
    }

    const config = new WheelConfig({
      name,
      segments,
      isDefault: isDefault || false,
      isActive: isActive !== undefined ? isActive : true,
      description: description || ''
    });

    await config.save();

    res.json({
      success: true,
      config: {
        id: config._id,
        name: config.name,
        segments: config.segments,
        isDefault: config.isDefault,
        isActive: config.isActive,
        description: config.description
      }
    });
  } catch (error) {
    console.error('Error creating wheel config:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Config name already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

// 휠 설정 업데이트
exports.updateConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, segments, isDefault, isActive, description } = req.body;

    const config = await WheelConfig.findById(id);

    if (!config) {
      return res.status(404).json({ error: 'Wheel config not found' });
    }

    if (name) config.name = name;
    if (segments) {
      if (segments.length < 4 || segments.length > 16) {
        return res.status(400).json({ error: 'Segments must be between 4 and 16' });
      }
      config.segments = segments;
    }
    if (description !== undefined) config.description = description;
    
    // 활성화 상태 변경
    if (isActive !== undefined && isActive !== config.isActive) {
      if (isActive) {
        // 다른 활성 설정 비활성화
        await WheelConfig.updateMany(
          { isActive: true, _id: { $ne: config._id } },
          { isActive: false }
        );
      }
      config.isActive = isActive;
    }

    // 기본 설정 변경
    if (isDefault !== undefined && isDefault !== config.isDefault) {
      if (isDefault) {
        // 기존 기본 설정 해제
        await WheelConfig.updateMany(
          { isDefault: true },
          { isDefault: false }
        );
      }
      config.isDefault = isDefault;
    }

    await config.save();

    res.json({
      success: true,
      config: {
        id: config._id,
        name: config.name,
        segments: config.segments,
        isDefault: config.isDefault,
        isActive: config.isActive,
        description: config.description
      }
    });
  } catch (error) {
    console.error('Error updating wheel config:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// 휠 설정 삭제
exports.deleteConfig = async (req, res) => {
  try {
    const { id } = req.params;

    const config = await WheelConfig.findById(id);

    if (!config) {
      return res.status(404).json({ error: 'Wheel config not found' });
    }

    if (config.isDefault) {
      return res.status(400).json({ error: 'Cannot delete default config' });
    }

    await WheelConfig.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Wheel config deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting wheel config:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

