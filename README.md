# MVP Runner - Full Stack Game Application

이 프로젝트는 React 프론트엔드와 Node.js/Express 백엔드가 통합된 풀스택 게임 애플리케이션입니다.

## 프로젝트 구조

```
server/
├── src/                    # React 프론트엔드 소스 코드
│   ├── components/         # React 컴포넌트
│   ├── services/           # API 서비스
│   ├── App.js
│   └── index.js
├── public/
│   └── admin/              # 관리자 패널
├── build/                  # React 빌드 결과물 (생성됨)
├── controllers/            # Express 컨트롤러
├── models/                 # MongoDB 모델
├── routes/                 # Express 라우트
├── middleware/             # Express 미들웨어
├── config/                 # 설정 파일
├── scripts/                # 유틸리티 스크립트
├── server.js               # Express 서버 진입점
└── package.json            # 통합된 패키지 의존성
```

## 설치 및 실행

### 1. 의존성 설치

```bash
cd server
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```
MONGODB_URI=mongodb://localhost:27017/mvp-runner
PORT=3001
NODE_ENV=development
```

### 3. 데이터베이스 초기화

```bash
npm run init-db
```

### 4. 개발 모드 실행

**옵션 1: 프론트엔드와 백엔드를 동시에 실행 (권장)**

하나의 명령으로 서버와 클라이언트를 동시에 실행:
```bash
npm run dev:all
```

이 명령은 다음을 실행합니다:
- 백엔드 서버: `http://localhost:3001` (nodemon으로 자동 재시작)
- 프론트엔드: `http://localhost:3000` (React 개발 서버)

**참고**: 브라우저가 자동으로 열리지 않으면 수동으로 `http://localhost:3000`을 열어주세요.

**옵션 2: 프론트엔드와 백엔드를 별도로 실행**

터미널 1 (백엔드):
```bash
npm run dev:server
```

터미널 2 (프론트엔드):
```bash
npm run dev:client
```

**옵션 3: 프로덕션 빌드 후 실행**

```bash
# React 앱 빌드
npm run build:prod

# 서버 실행 (빌드된 React 앱 서빙)
npm start
```

## 서버 엔드포인트

서버는 `http://localhost:3001`에서 실행됩니다.

- **게임 프론트엔드**: `http://localhost:3001/`
- **게임 API**: `http://localhost:3001/api/*`
- **관리자 패널**: `http://localhost:3001/admin`

## 빌드 및 배포

### 프로덕션 빌드

```bash
npm run build:prod
```

빌드된 파일은 `server/build/` 디렉토리에 생성됩니다.

### 프로덕션 실행

```bash
NODE_ENV=production npm start
```

## 주요 기능

- ✅ 사용자 관리 (Telegram 연동)
- ✅ 게임 기록 및 리더보드
- ✅ 주간 목표 설정
- ✅ 프로모션 코드 시스템
- ✅ 행운의 휠 (Wheel of Fortune)
- ✅ 상점 시스템
- ✅ 관리자 패널

## 개발 가이드

### 프론트엔드 개발

프론트엔드 코드는 `server/src/` 디렉토리에 있습니다.
- React 컴포넌트: `src/components/`
- API 서비스: `src/services/api.js`

### 백엔드 개발

백엔드 코드는 `server/` 루트에 있습니다.
- 컨트롤러: `controllers/`
- 모델: `models/`
- 라우트: `routes/`

### API 통신

프론트엔드에서 API를 호출할 때:
- 개발 모드: `http://localhost:3001/api`
- 프로덕션 모드: `/api` (상대 경로)

`src/services/api.js`에서 자동으로 환경에 맞게 설정됩니다.

## 문제 해결

### 포트 충돌

기본 포트는 3001입니다. `.env` 파일에서 `PORT`를 변경할 수 있습니다.

### MongoDB 연결 오류

MongoDB가 실행 중인지 확인하고, `.env` 파일의 `MONGODB_URI`가 올바른지 확인하세요.

### 빌드 오류

`node_modules`를 삭제하고 다시 설치하세요:
```bash
rm -rf node_modules package-lock.json
npm install
```
