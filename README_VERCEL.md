# Vercel 배포 가이드

이 프로젝트를 Vercel에 배포하는 방법입니다.

## 배포 전 준비사항

### 1. 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수를 설정하세요:

```
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=production
REACT_APP_API_URL=/api
```

### 2. 빌드 설정

Vercel은 자동으로 다음을 수행합니다:
- `npm run build:prod` 실행 (React 앱 빌드)
- `api/index.js`를 서버리스 함수로 변환
- `build/` 폴더의 정적 파일 서빙

## 배포 방법

### GitHub 연동 배포 (권장)

1. GitHub에 코드 푸시
2. Vercel 대시보드에서 "New Project" 클릭
3. GitHub 저장소 선택
4. 프로젝트 설정:
   - **Root Directory**: `server` (또는 프로젝트 루트)
   - **Build Command**: `npm run build:prod`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`
5. 환경 변수 설정
6. "Deploy" 클릭

### Vercel CLI 배포

```bash
cd server
npm install -g vercel
vercel
```

## 배포 후 확인

배포가 완료되면:
- 게임 프론트엔드: `https://your-domain.vercel.app/`
- Admin 패널: `https://your-domain.vercel.app/admin`
- API: `https://your-domain.vercel.app/api/*`

## 문제 해결

### API 요청이 405 오류 발생

`vercel.json`의 rewrites 설정이 올바른지 확인하세요.

### MongoDB 연결 오류

Vercel 환경 변수에서 `MONGODB_URI`가 올바르게 설정되었는지 확인하세요.

### 빌드 실패

`package.json`의 `build:prod` 스크립트가 올바른지 확인하세요.





