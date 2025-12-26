-- ============================================
-- 비밀번호 해시 수정 스크립트
-- ============================================
-- admin@o2pluss.com 사용자의 비밀번호를 admin123으로 재설정
-- 
-- 사용법:
-- 1. 로컬에서 해시 생성: node -e "const bcrypt=require('bcryptjs');bcrypt.hash('admin123',10).then(h=>console.log(h))"
-- 2. 생성된 해시를 아래 UPDATE 문에 넣어서 실행

-- 현재 DB에 저장된 해시 확인
SELECT email, password_hash FROM users WHERE email = 'admin@o2pluss.com';

-- 비밀번호 해시 업데이트 (아래 해시는 예시입니다. 위 명령어로 새로 생성하세요)
-- UPDATE users 
-- SET password_hash = '새로운_해시값'
-- WHERE email = 'admin@o2pluss.com';

-- 또는 직접 새 비밀번호로 사용자 생성 (기존 사용자 삭제 후)
-- DELETE FROM users WHERE email = 'admin@o2pluss.com';
-- DELETE FROM tenant_users WHERE user_id IN (SELECT id FROM users WHERE email = 'admin@o2pluss.com');
-- 
-- INSERT INTO users (email, password_hash, name) 
-- VALUES (
--   'admin@o2pluss.com',
--   '새로운_해시값',
--   'O2PLUSS 운영자'
-- );
