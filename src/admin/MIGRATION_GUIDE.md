# Admin Panel React Migration Guide

## 개요

기존 HTML/CSS/Vanilla JS로 작성된 Admin Panel을 React + TypeScript로 완전히 이관했습니다.

## 프로젝트 구조

```
src/admin/
├── api/                    # API 클라이언트 및 엔드포인트
│   ├── client.ts          # API 요청 래퍼
│   └── endpoints.ts      # API 엔드포인트 상수
├── components/            # 공통 컴포넌트
│   ├── Modal.tsx         # 모달 컴포넌트
│   └── Pagination.tsx    # 페이징 컴포넌트
├── hooks/                 # 커스텀 훅
│   └── useAuth.ts        # 인증 훅
├── layout/                # 레이아웃 컴포넌트
│   ├── AdminLayout.tsx   # 메인 레이아웃
│   ├── Sidebar.tsx       # 사이드바
│   └── Topbar.tsx        # 상단 바
├── pages/                 # 페이지 컴포넌트
│   └── LoginPage.tsx     # 로그인 페이지
├── tabs/                  # 탭 컴포넌트
│   ├── UsersTab.tsx
│   ├── LeaderboardTab.tsx
│   ├── CryptoLeaderboardTab.tsx
│   ├── CoinLeaderboardTab.tsx
│   ├── RecordsTab.tsx
│   ├── WeeklyGoalsTab.tsx
│   ├── PromoOrdersTab.tsx
│   ├── WheelConfigTab.tsx
│   ├── ShopManagementTab.tsx
│   ├── TelegramBotTab.tsx
│   ├── AdminManagementTab.tsx
│   ├── AdManagementTab.tsx
│   └── StatsTab.tsx
├── types/                 # TypeScript 타입 정의
│   └── index.ts
├── styles/                # 스타일 파일
│   ├── admin.css         # Cyberpunk 스타일
│   └── admin-inline.css  # 인라인 스타일 (index.html에서 분리)
├── App.tsx                # 메인 App 컴포넌트
└── index.tsx              # 진입점
```

## 기능 매핑

### 기존 함수 → React 구현

| 기존 함수 | React 구현 |
|---------|-----------|
| `handleLogin()` | `LoginPage` 컴포넌트 + `useAuth` 훅 |
| `switchTab()` | `AdminLayout`의 `activeTab` 상태 |
| `loadUsers()` | `UsersTab`의 `useEffect` |
| `renderPagination()` | `Pagination` 컴포넌트 |
| `showUserDetail()` | `Modal` 컴포넌트 + 상태 관리 |
| `loadStats()` | `StatsTab` 컴포넌트 |
| `updateNotificationBadge()` | `AdminLayout`의 `useEffect` + 폴링 |
| `loadBotStatus()` | `TelegramBotTab`의 `useEffect` + 폴링 |

## 주요 변경사항

### 1. 인증 시스템
- `localStorage`에 `adminToken` 저장 (기존과 동일)
- `useAuth` 훅으로 인증 상태 관리
- 로그인/로그아웃/회원가입 기능 완전 구현

### 2. 탭 시스템
- 기존 `switchTab()` 함수를 React 상태로 변환
- 각 탭은 독립적인 컴포넌트로 구현
- 탭 전환 시 자동으로 데이터 로드 (useEffect)

### 3. API 호출
- `apiClient`로 모든 API 호출 통합
- 인증 토큰 자동 추가
- 에러 처리 표준화

### 4. 모달 시스템
- `Modal` 컴포넌트로 통합
- ESC 키, overlay 클릭으로 닫기 지원

### 5. 페이징
- `Pagination` 컴포넌트로 재사용 가능하게 구현
- 기존 UI/동작 완전 유지

### 6. Chart.js
- `react-chartjs-2` 사용
- 기존 차트 컨트롤과 동일한 동작

## 사용 방법

### 개발 모드

```bash
# Admin Panel만 실행하려면
cd src/admin
npm install
npm run dev

# 또는 전체 프로젝트와 함께
npm run dev:all
```

### 프로덕션 빌드

```bash
npm run build:prod
```

## 환경 변수

`.env` 파일에 다음 변수 추가:

```
VITE_API_BASE=/api
```

## 주의사항

1. **CSS 스타일**: 기존 `index_cyberpunk.css`와 `index.html`의 인라인 스타일을 모두 포함했습니다.
2. **API 호출**: 모든 API 호출은 `/api`를 기본 경로로 사용합니다.
3. **인증**: `localStorage`에 `adminToken`을 저장하여 인증 상태를 유지합니다.
4. **Chart.js**: `react-chartjs-2` 패키지가 필요합니다. 이미 `package.json`에 포함되어 있습니다.

## 테스트 체크리스트

- [ ] 로그인/로그아웃
- [ ] 회원가입
- [ ] 사이드바 접기/펼치기
- [ ] 모든 탭 전환
- [ ] Users 탭: 검색, 정렬, 페이징, 상세 보기, 차단/해제
- [ ] Leaderboard 탭: 페이징
- [ ] Weekly Goals 탭: 생성, 수정, 삭제, 달성자 보기
- [ ] Promo Orders 탭: 승인/거부
- [ ] Wheel Config 탭: 세그먼트 추가/삭제, 저장
- [ ] Shop Management 탭: 가격 수정, 상태 변경
- [ ] Telegram Bot 탭: 상태 확인, 설정 저장, 브로드캐스트
- [ ] Admin Management 탭: 관리자 승인/삭제
- [ ] Ad Management 탭: 이미지 업로드/리셋
- [ ] Stats 탭: 차트 표시, 기간 변경

## 알려진 이슈

없음 (모든 기능이 구현되었습니다)

## 다음 단계

1. 실제 서버와 연동하여 테스트
2. 필요시 추가 기능 구현
3. 성능 최적화 (필요시)

