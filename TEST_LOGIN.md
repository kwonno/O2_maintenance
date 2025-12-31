# 로그인 문제 해결 가이드

## 1. 브라우저 콘솔 확인

로그인 시도 시 브라우저 개발자 도구(F12) > Console 탭에서 다음 로그를 확인하세요:

- "로그인 시도: { email: '...' }"
- "로그인 응답: { status: ..., data: ... }"
- 에러 메시지

## 2. DB 비밀번호 해시 확인

Supabase SQL Editor에서 실행:

```sql
-- 현재 저장된 해시 확인
SELECT email, password_hash, LEFT(password_hash, 20) as hash_preview 
FROM users 
WHERE email = 'admin@o2pluss.com';
```

## 3. 비밀번호 해시 재설정

로컬에서 새 해시 생성:

```bash
node -e "const bcrypt=require('bcryptjs');bcrypt.hash('admin123',10).then(h=>console.log('UPDATE users SET password_hash = '' + h + '' WHERE email = ''admin@o2pluss.com'';'))"
```

생성된 SQL을 Supabase에서 실행하세요.

## 4. 직접 테스트

로컬에서 비밀번호 검증 테스트:

```bash
node -e "const bcrypt=require('bcryptjs');const hash='DB에_저장된_해시';bcrypt.compare('admin123',hash).then(r=>console.log('Match:',r))"
```

## 5. API 직접 테스트

브라우저 콘솔에서:

```javascript
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@o2pluss.com', password: 'admin123' }),
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```

## 6. 쿠키 확인

로그인 성공 후 브라우저 개발자 도구 > Application > Cookies에서:
- `session_id` 쿠키가 있는지 확인
- `user_id` 쿠키가 있는지 확인



