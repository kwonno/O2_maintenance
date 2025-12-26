# 빠른 시작 가이드

## 1단계: 데이터베이스 설정

Supabase 대시보드 > SQL Editor에서 다음 파일의 내용을 **전체 복사**해서 실행하세요:

**`supabase/migrations/COMPLETE_SETUP.sql`**

이 스크립트는 다음을 자동으로 수행합니다:
- ✅ users 테이블 생성
- ✅ 외래키 관계 수정
- ✅ 운영사 테넌트 생성
- ✅ 초기 운영자 사용자 생성 (이메일: admin@o2it.com, 비밀번호: admin123)

## 2단계: 로그인

1. 애플리케이션 접속: `/login`
2. 로그인 정보:
   - **이메일**: `admin@o2pluss.com`
   - **비밀번호**: `admin123`

## 3단계: 추가 사용자 생성

로그인 후 `/admin/users`에서 추가 사용자를 생성할 수 있습니다.

---

## ⚠️ 중요: 보안

**운영 환경에서는 반드시 초기 비밀번호를 변경하세요!**

비밀번호 변경 방법:
1. `/admin/users`에서 사용자 목록 확인
2. 필요시 SQL로 직접 변경:
```sql
-- 비밀번호 해시 생성 (Node.js)
-- node -e "const bcrypt=require('bcryptjs');bcrypt.hash('새비밀번호',10).then(h=>console.log(h))"

-- 비밀번호 업데이트
UPDATE users 
SET password_hash = '새로운_해시값'
WHERE email = 'admin@o2pluss.com';
```

