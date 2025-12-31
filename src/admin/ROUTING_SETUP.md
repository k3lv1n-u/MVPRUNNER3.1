# Admin Panel 라우팅 설정 완료

## 설정 내용

### 1. React Router 통합
- `src/App.js`에 React Router 추가
- `/` 경로: 기존 게임 (Game 컴포넌트)
- `/admin/*` 경로: Admin Panel (AdminApp 컴포넌트)

### 2. 서버 설정
- `server.js`에서 `/admin` 정적 파일 서빙 제거
- React Router가 `/admin` 경로를 처리하도록 변경
- 모든 경로(`*`)에 `index.html` 서빙하여 React Router가 클라이언트 사이드 라우팅 처리

## 접근 방법

### 개발 모드
```bash
npm run dev:all
```

접속:
- 게임: `http://localhost:3000/`
- Admin Panel: `http://localhost:3000/admin`

### 프로덕션 모드
```bash
npm run build:prod
npm start
```

접속:
- 게임: `http://localhost:3001/`
- Admin Panel: `http://localhost:3001/admin`

## 주의사항

1. **TypeScript 지원**: `react-scripts`는 TypeScript를 지원하므로 `.tsx` 파일을 그대로 사용할 수 있습니다.

2. **환경 변수**: 
   - 개발 모드: `REACT_APP_API_BASE` 사용
   - Vite 모드: `VITE_API_BASE` 사용
   - 기본값: `/api`

3. **기존 HTML Admin Panel**: 
   - `public/admin/index.html`은 그대로 유지됩니다
   - 필요시 `/admin-legacy` 같은 경로로 접근 가능하도록 설정 가능

## 라우팅 구조

```
/                    → Game 컴포넌트
/admin               → AdminApp (로그인 페이지 또는 Admin Panel)
/admin/*            → AdminApp (모든 하위 경로)
```

## 다음 단계

1. 빌드 테스트
   ```bash
   npm run build:dev
   ```

2. 서버 실행 테스트
   ```bash
   npm start
   ```

3. 브라우저에서 확인
   - `http://localhost:3001/` - 게임
   - `http://localhost:3001/admin` - Admin Panel

