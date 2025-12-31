/**
 * 사운드 관리 유틸리티
 * 배경음악과 효과음을 중앙에서 관리합니다.
 */

class SoundManager {
  constructor() {
    // 배경음악
    this.bgMusic = null;
    this.bgMusicEnabled = true;
    this.bgMusicVolume = 0.5;
    
    // 효과음
    this.soundEffectsEnabled = true;
    this.soundEffectsVolume = 0.7;
    
    // 사운드 파일 경로
    this.sounds = {
      background: '/run,-space-puree,-run!.mp3',
      buttonClick: '/menuclick.wav',
      coin: '/coin.wav',
      win: '/win.wav'
    };
    
    // 효과음 오디오 객체 캐시
    this.soundCache = {};

    // 코인 사운드 쿨타임 (너무 자주 재생될 때 프레임 드랍 방지)
    this.lastCoinPlayTime = 0;
    this.coinCooldownMs = 100; // 최소 100ms 간격
    
    // localStorage에서 설정 로드
    this.loadSettings();
    
    // 배경음악 초기화
    this.initBackgroundMusic();
  }
  
  /**
   * localStorage에서 사운드 설정 로드
   */
  loadSettings() {
    const bgMusicEnabled = localStorage.getItem('bgMusicEnabled');
    const soundEffectsEnabled = localStorage.getItem('soundEffectsEnabled');
    const bgMusicVolume = localStorage.getItem('bgMusicVolume');
    const soundEffectsVolume = localStorage.getItem('soundEffectsVolume');
    
    if (bgMusicEnabled !== null) {
      this.bgMusicEnabled = bgMusicEnabled === 'true';
    }
    if (soundEffectsEnabled !== null) {
      this.soundEffectsEnabled = soundEffectsEnabled === 'true';
    }
    if (bgMusicVolume !== null) {
      this.bgMusicVolume = parseFloat(bgMusicVolume);
    }
    if (soundEffectsVolume !== null) {
      this.soundEffectsVolume = parseFloat(soundEffectsVolume);
    }
  }
  
  /**
   * 배경음악 초기화
   */
  initBackgroundMusic() {
    if (typeof Audio === 'undefined') return;
    
    // 이미 초기화되어 있으면 다시 초기화하지 않음
    if (this.bgMusic) return;
    
    try {
      this.bgMusic = new Audio(this.sounds.background);
      this.bgMusic.loop = true;
      this.bgMusic.volume = this.bgMusicVolume;
      this.bgMusic.preload = 'auto';
      
      // 오류 처리
      this.bgMusic.addEventListener('error', (e) => {
        console.warn('Background music failed to load:', e);
      });
      
      // 자동 재생 정책으로 인한 재생 실패 처리
      this.bgMusic.addEventListener('play', () => {
        this._needsUserInteraction = false; // 재생 성공 시 플래그 리셋
      });
      
      this.bgMusic.addEventListener('pause', () => {
      });
      
      // 로드 완료 이벤트
      this.bgMusic.addEventListener('canplaythrough', () => {
      });
    } catch (error) {
      console.warn('Failed to initialize background music:', error);
    }
  }
  
  /**
   * 배경음악 재생
   */
  playBackgroundMusic() {
    if (!this.bgMusic || !this.bgMusicEnabled) return;
    
    // bgMusic이 아직 초기화되지 않았으면 초기화 시도
    if (!this.bgMusic) {
      this.initBackgroundMusic();
      if (!this.bgMusic) return;
    }
    
    // 이미 재생 중이면 재생하지 않음
    if (!this.bgMusic.paused) {
      return;
    }
    
    try {
      // 현재 시간이 0이 아니면 처음부터 재생
      if (this.bgMusic.currentTime > 0) {
        this.bgMusic.currentTime = 0;
      }
      
      // 볼륨 설정 확인
      if (this.bgMusic.volume !== this.bgMusicVolume) {
        this.bgMusic.volume = this.bgMusicVolume;
      }
      
      const playPromise = this.bgMusic.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this._needsUserInteraction = false; // 재생 성공 시 플래그 리셋
          })
          .catch(error => {
            // 자동 재생 정책으로 인한 오류는 무시하되 로그는 남김
            console.warn('Background music autoplay prevented:', error);
            // 사용자 상호작용 후 재생을 시도할 수 있도록 플래그 설정
            this._needsUserInteraction = true;
          });
      }
    } catch (error) {
      console.warn('Failed to play background music:', error);
      this._needsUserInteraction = true;
    }
  }
  
  /**
   * 배경음악 정지
   */
  stopBackgroundMusic() {
    if (!this.bgMusic) return;
    
    try {
      this.bgMusic.pause();
      this.bgMusic.currentTime = 0;
    } catch (error) {
      console.warn('Failed to stop background music:', error);
    }
  }
  
  /**
   * 배경음악 활성화/비활성화
   */
  setBackgroundMusicEnabled(enabled) {
    this.bgMusicEnabled = enabled;
    localStorage.setItem('bgMusicEnabled', enabled.toString());
    
    if (enabled) {
      this.playBackgroundMusic();
    } else {
      this.stopBackgroundMusic();
    }
  }
  
  /**
   * 배경음악 볼륨 설정
   */
  setBackgroundMusicVolume(volume) {
    this.bgMusicVolume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('bgMusicVolume', this.bgMusicVolume.toString());
    
    if (this.bgMusic) {
      this.bgMusic.volume = this.bgMusicVolume;
    }
  }
  
  /**
   * 효과음 활성화/비활성화
   */
  setSoundEffectsEnabled(enabled) {
    this.soundEffectsEnabled = enabled;
    localStorage.setItem('soundEffectsEnabled', enabled.toString());
  }
  
  /**
   * 효과음 볼륨 설정
   */
  setSoundEffectsVolume(volume) {
    this.soundEffectsVolume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('soundEffectsVolume', this.soundEffectsVolume.toString());
  }
  
  /**
   * 효과음 재생
   */
  playSound(soundName) {
    if (!this.soundEffectsEnabled) return;
    
    if (typeof Audio === 'undefined') return;
    
    try {
      // 캐시에서 가져오거나 새로 생성
      let audio = this.soundCache[soundName];
      
      if (!audio) {
        const soundPath = this.sounds[soundName];
        if (!soundPath) {
          console.warn(`Sound not found: ${soundName}`);
          return;
        }
        
        audio = new Audio(soundPath);
        audio.volume = this.soundEffectsVolume;
        audio.preload = 'auto';
        this.soundCache[soundName] = audio;
      }
      
      // 볼륨 업데이트
      audio.volume = this.soundEffectsVolume;
      
      // 재생 (현재 재생 중이면 처음부터 다시)
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn(`Failed to play sound ${soundName}:`, error);
        });
      }
    } catch (error) {
      console.warn(`Error playing sound ${soundName}:`, error);
    }
  }
  
  /**
   * 버튼 클릭 사운드
   */
  playButtonClick() {
    this.playSound('buttonClick');
    
    // 사용자 상호작용 후 배경음악 재생 시도 (자동 재생 정책 우회)
    if (this._needsUserInteraction && this.bgMusicEnabled && this.bgMusic) {
      this._needsUserInteraction = false;
      this.playBackgroundMusic();
    }
  }
  
  /**
   * 버운티 수집 사운드
   */
  playCoin() {
    const now = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();

    // 너무 짧은 시간 안에 여러 번 재생되는 것을 막아 성능 문제 완화
    if (now - this.lastCoinPlayTime < this.coinCooldownMs) {
      return;
    }

    this.lastCoinPlayTime = now;
    this.playSound('coin');
  }
  
  /**
   * 게임 오버 사운드
   */
  playWin() {
    this.playSound('win');
  }
  
  /**
   * 설정 변경 시 콜백 등록 (Settings 컴포넌트에서 사용)
   */
  onSettingsChange(callback) {
    this.settingsChangeCallback = callback;
  }
  
  /**
   * 설정 변경 알림
   */
  notifySettingsChange() {
    if (this.settingsChangeCallback) {
      this.settingsChangeCallback();
    }
  }
}

// 싱글톤 인스턴스 생성 및 export
const soundManager = new SoundManager();
export default soundManager;

