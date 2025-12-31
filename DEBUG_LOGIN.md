# 로그인 디버깅 가이드

## 문제: 빈 JSON 응답

"Unexpected end of JSON input" 에러는 서버에서 빈 응답을 보낼 때 발생합니다.

## 해결 방법

### 1. Vercel에 재배포

변경사항이 배포되었는지 확인:
```bash
vercel --prod
```

### 2. 브라우저에서 상세 테스트

```javascript
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@o2pluss.com', password: 'admin123' }),
  credentials: 'include'
})
.then(async r => {
  console.log('Status:', r.status)
  console.log('Status Text:', r.statusText)
  console.log('Headers:', [...r.headers.entries()])
  const text = await r.text()
  console.log('Raw Response:', text)
  console.log('Response Length:', text.length)
  if (text) {
    try {
      return JSON.parse(text)
    } catch (e) {
      console.error('Parse Error:', e)
      return { raw: text, error: 'Invalid JSON' }
    }
  }
  return { error: 'Empty response' }
})
.then(console.log)
.catch(err => {
  console.error('Fetch Error:', err)
})
```

### 3. Vercel 로그 확인

Vercel 대시보드 > 프로젝트 > Functions > Logs에서 서버 로그 확인

### 4. 로컬에서 테스트

로컬 개발 서버에서 테스트:
```bash
npm run dev
```

그 다음 `http://localhost:3000/login`에서 테스트

### 5. 네트워크 탭 확인

브라우저 개발자 도구 > Network 탭에서:
- `/api/auth/login` 요청 확인
- Response 탭에서 실제 응답 확인
- Headers 탭에서 요청/응답 헤더 확인

## 가능한 원인

1. **Vercel 환경 변수 문제**: Supabase 연결 실패
2. **비동기 처리 문제**: await 누락
3. **에러 발생 시 빈 응답**: try-catch에서 응답을 반환하지 않음

## 빠른 해결책

로컬에서 먼저 테스트:
```bash
npm run dev
```

로컬에서 작동하면 Vercel 배포 문제일 가능성이 높습니다.



