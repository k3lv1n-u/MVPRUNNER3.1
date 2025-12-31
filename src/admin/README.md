# Admin Panel - React Migration

이 디렉토리는 기존 HTML/CSS/Vanilla JS Admin Panel을 React로 완전히 이관한 버전입니다.

## 구조

```
src/admin/
├── components/          # 공통 컴포넌트
│   ├── Modal.tsx
│   ├── Pagination.tsx
│   ├── DataTable.tsx
│   ├── ChartPanel.tsx
│   └── ...
├── pages/              # 페이지 컴포넌트
│   ├── LoginPage.tsx
│   └── AdminDashboard.tsx
├── layout/             # 레이아웃 컴포넌트
│   ├── AdminLayout.tsx
│   ├── Sidebar.tsx
│   └── Topbar.tsx
├── tabs/               # 탭 컴포넌트
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
├── api/                # API 클라이언트
│   ├── client.ts
│   └── endpoints.ts
├── hooks/              # 커스텀 훅
│   ├── useAuth.ts
│   ├── usePagination.ts
│   └── ...
├── utils/              # 유틸리티
│   ├── formatters.ts
│   ├── clipboard.ts
│   └── ...
├── types/              # TypeScript 타입 정의
│   ├── index.ts
│   └── ...
└── styles/             # 스타일
    ├── admin.css
    └── ...
```

## 기능 매핑

기존 index.html의 함수들을 React 컴포넌트/훅으로 매핑:

| 기존 함수 | React 구현 |
|---------|-----------|
| `handleLogin()` | `LoginPage` 컴포넌트 |
| `switchTab()` | `AdminLayout`의 탭 상태 관리 |
| `loadUsers()` | `UsersTab` 컴포넌트의 `useEffect` |
| `renderPagination()` | `Pagination` 컴포넌트 |
| `showUserDetail()` | `Modal` 컴포넌트 + 상태 관리 |
| `loadStats()` | `StatsTab` 컴포넌트 |
| `updateNotificationBadge()` | `Topbar`의 `useEffect` + 폴링 |
| `loadBotStatus()` | `TelegramBotTab`의 `useEffect` + 폴링 |

## API 엔드포인트

모든 API 호출은 `src/admin/api/client.ts`를 통해 이루어집니다.

## 스타일

기존 `index_cyberpunk.css`의 클래스명을 그대로 유지하여 동일한 디자인을 보장합니다.

