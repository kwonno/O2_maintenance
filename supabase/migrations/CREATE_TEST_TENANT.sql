-- ============================================
-- 테스트 테넌트 및 사용자 생성 스크립트
-- ============================================
-- 바로 실행 가능!

-- 1. "테스트" 테넌트 생성
INSERT INTO tenants (name) 
VALUES ('테스트')
ON CONFLICT DO NOTHING;

-- 2. 테스트 사용자 생성
-- 이메일: test@o2pluss.com
-- 비밀번호: test123
INSERT INTO users (email, password_hash, name) 
VALUES (
  'test@o2pluss.com',
  '$2b$10$w.TaUjKjsd8ITdia4f//Gu5lHs/DrUeUT5YnYPrvy6u9tAujyE5K.', -- test123의 해시
  '테스트 사용자'
)
ON CONFLICT (email) DO NOTHING;

-- 3. 테스트 사용자를 테넌트에 연결 (customer 역할)
INSERT INTO tenant_users (user_id, tenant_id, role)
SELECT 
  u.id,
  t.id,
  'customer'
FROM users u
CROSS JOIN tenants t
WHERE u.email = 'test@o2pluss.com'
  AND t.name = '테스트'
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- ============================================
-- 완료!
-- ============================================
-- 로그인 정보:
-- 이메일: test@o2pluss.com
-- 비밀번호: test123 (또는 admin123)
-- ============================================

