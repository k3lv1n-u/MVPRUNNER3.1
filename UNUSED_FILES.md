# 사용하지 않는 파일 및 코드 정리 가이드

## 1. 완전히 제거 가능한 파일들

### 테스트/디버깅 파일
- `reproduce_issue.js` - BotConfig 테스트용 스크립트, 프로덕션에서 불필요

### 사용되지 않는 CSS 스타일
- `src/components/Game.css`의 `landscape-prompt` 관련 스타일 (라인 104-236)
  - `.landscape-prompt`
  - `.landscape-prompt-content`
  - `.landscape-icon`
  - `.landscape-title`
  - `.landscape-message`
  - `.landscape-back-btn`
  - 관련 `@keyframes` 및 미디어 쿼리
  - **이유**: 세로 모드를 완전히 제거하고 가로 모드만 허용하도록 변경했으므로 더 이상 필요 없음

### 중복된 리소스 파일 (확인 필요)
- 루트 디렉토리의 이미지 파일들:
  - `boot1 (3).png` - `public/`에 `boot1.png`가 있음
  - `perch (2).png`, `perch1.png` - 사용처 확인 필요
  - `goal reach.jpg`, `weekgoal.jpg`, `welcome.jpg`, `win.jpg` - 사용처 확인 필요
  - `profile.jpg` - 사용처 확인 필요

### 중복된 유틸리티 파일 (확인 필요)
- `utils/emulatorDetection.js` vs `src/utils/emulatorDetection.js`
  - 두 파일이 비슷한 기능을 하는지 확인 필요
  - 하나로 통합 가능할 수 있음

## 2. 조건부로 제거 가능한 파일들

### Vercel 배포 관련
- `api/index.js` - Vercel 서버리스 함수용
  - **제거 조건**: Vercel이 아닌 다른 플랫폼에서 배포하는 경우
  - **유지 조건**: Vercel에서 배포하는 경우 필요

- `vercel.json` - Vercel 설정 파일
  - **제거 조건**: Vercel이 아닌 다른 플랫폼에서 배포하는 경우
  - **유지 조건**: Vercel에서 배포하는 경우 필요

- `README_VERCEL.md` - Vercel 배포 가이드
  - **제거 조건**: Vercel을 사용하지 않는 경우
  - **유지 조건**: Vercel 배포 문서가 필요한 경우

## 3. 사용 중인 파일들 (제거하지 말 것)

### Channel 관련 (사용 중)
- `controllers/channelController.js` - ChannelSubscriptionCheck 컴포넌트에서 사용
- `routes/channelRoutes.js` - API 엔드포인트로 사용
- `src/components/ChannelSubscriptionCheck.jsx` - 게임 시작 시 채널 가입 확인에 사용

### 이미지 파일들 (사용 중)
- `public/` 디렉토리의 모든 이미지 파일들은 게임에서 사용 중

## 4. 정리 작업 순서

1. **즉시 제거 가능**:
   - `reproduce_issue.js` 삭제
   - `src/components/Game.css`에서 `landscape-prompt` 관련 CSS 제거

2. **확인 후 제거**:
   - 루트 디렉토리의 중복 이미지 파일들 확인 후 제거
   - `utils/emulatorDetection.js`와 `src/utils/emulatorDetection.js` 비교 후 통합

3. **배포 환경에 따라 결정**:
   - Vercel 관련 파일들 (`api/index.js`, `vercel.json`, `README_VERCEL.md`)

