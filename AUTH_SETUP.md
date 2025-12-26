# 인증 시스템 설정 가이드

## 변경 사항

Supabase Auth 대신 **DB 기반 자체 인증 시스템**으로 전환했습니다.

### 주요 변경점

1. **users 테이블 추가**: 이메일/비밀번호를 DB에서 직접 관리
2. **세션 관리**: 쿠키 기반 세션 (향후 JWT로 확장 가능)
3. **tenant_users 연결**: users 테이블과 연결

## 데이터베이스 마이그레이션

### 1. users 테이블 생성

Supabase SQL Editor에서 다음을 실행:

```sql
-- supabase/migrations/003_add_users_table.sql 실행
```

### 2. 초기 운영자 사용자 생성

#### 방법 1: 관리자 화면에서 생성 (권장)

1. 먼저 테넌트를 생성: `/admin/tenants`
2. 사용자 생성: `/admin/users`
   - 이메일, 비밀번호, 이름 입력
   - 테넌트 선택
   - 역할: "운영 관리자" 선택

#### 방법 2: SQL로 직접 생성

```sql
-- 1. 테넌트 생성
INSERT INTO tenants (name) VALUES ('운영사');

-- 2. 사용자 생성 (비밀번호 해시는 Node.js에서 생성 필요)
-- 비밀번호: admin123
-- 해시 생성: node -e "const bcrypt=require('bcryptjs');bcrypt.hash('admin123',10).then(h=>console.log(h))"
INSERT INTO users (email, password_hash, name) 
VALUES (
  'admin@example.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- admin123의 해시
  '운영자'
);

-- 3. tenant_users에 연결
INSERT INTO tenant_users (user_id, tenant_id, role)
VALUES (
  (SELECT id FROM users WHERE email = 'admin@example.com'),
  (SELECT id FROM tenants WHERE name = '운영사'),
  'operator_admin'
);
```

#### 방법 3: 스크립트 사용

```bash
# .env.local 파일에 환경 변수 설정 후
node scripts/create-admin-user.js
```

## 로그인 방법

1. 애플리케이션 접속: `/login`
2. 생성한 사용자의 이메일/비밀번호로 로그인
3. 로그인 성공 시 `/app`으로 리다이렉트

## 사용자 관리

### 운영자 권한으로 사용자 생성

1. `/admin/users` 접속
2. "새 사용자 생성" 폼 작성:
   - 이메일
   - 비밀번호
   - 이름 (선택)
   - 테넌트 선택
   - 역할 선택 (고객/운영 관리자)

### 사용자 목록 확인

`/admin/users`에서 생성된 모든 사용자 목록 확인 가능

## 보안 고려사항

1. **비밀번호 해싱**: bcrypt 사용 (salt rounds: 10)
2. **세션 관리**: HttpOnly 쿠키 사용
3. **향후 개선**: JWT 토큰으로 전환 권장

## Supabase Auth 제거

다음 파일들이 Supabase Auth를 사용하지 않도록 수정되었습니다:

- `lib/auth.ts` - 자체 인증 시스템 사용
- `lib/auth/db.ts` - DB 기반 사용자 관리
- `lib/auth/session.ts` - 쿠키 기반 세션
- `app/login/page.tsx` - 자체 로그인 API 사용
- `middleware.ts` - 쿠키 기반 인증 체크

## 문제 해결

### 로그인이 안 될 때

1. users 테이블에 사용자가 있는지 확인
2. tenant_users에 연결되어 있는지 확인
3. 비밀번호 해시가 올바른지 확인

### 권한 오류

1. tenant_users 테이블에서 role이 올바른지 확인
2. operator_admin 권한이 필요한 경우 role 확인

