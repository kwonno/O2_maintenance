# Vercel 배포 문제 해결

## 로컬에서는 작동하지만 Vercel에서 안 될 때

### 1. 환경 변수 확인

Vercel 대시보드 > Settings > Environment Variables에서 다음이 설정되어 있는지 확인:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (선택사항, 서버 사이드에서만 사용)

**중요**: 각 환경 변수에 대해 Production, Preview, Development 모두 선택되어 있는지 확인하세요.

### 2. 재배포

환경 변수를 변경한 후에는 반드시 재배포해야 합니다:

```bash
vercel --prod
```

또는 Vercel 대시보드에서:
- Deployments 탭
- 최신 배포 선택
- "Redeploy" 클릭

### 3. 함수 로그 확인

Vercel 대시보드 > 프로젝트 > Functions > Logs에서:
- `/api/auth/login` 함수의 로그 확인
- 에러 메시지 확인

### 4. 가능한 문제들

1. **환경 변수 누락**: `NEXT_PUBLIC_SUPABASE_URL` 또는 `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 없음
2. **RLS 정책**: Supabase RLS가 활성화되어 있어서 접근 불가
3. **CORS 문제**: 도메인 간 요청 문제
4. **쿠키 설정**: `secure: true`로 설정되어 있는데 HTTPS가 아닌 경우

### 5. 빠른 확인

Vercel 배포 URL에서 직접 테스트:
```
https://your-app.vercel.app/api/auth/login
```

POST 요청을 보내서 응답 확인



