-- ============================================
-- O2PLUSS 초기 설정 스크립트 (바로 실행 가능)
-- ============================================
-- 이 파일을 Supabase SQL Editor에 복사해서 실행하세요!
-- 주의: users 테이블은 이미 생성되어 있다고 가정합니다.

-- 1. tenant_users의 외래키를 users로 변경 (이미 되어있을 수 있음)
ALTER TABLE tenant_users 
  DROP CONSTRAINT IF EXISTS tenant_users_user_id_fkey;

ALTER TABLE tenant_users
  ADD CONSTRAINT tenant_users_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 2. inspections의 performed_by를 users로 변경 (이미 되어있을 수 있음)
ALTER TABLE inspections
  DROP CONSTRAINT IF EXISTS inspections_performed_by_fkey;

ALTER TABLE inspections
  ADD CONSTRAINT inspections_performed_by_fkey
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL;

-- 3. 인덱스 생성 (이미 되어있을 수 있음)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- 초기 데이터 생성
-- ============================================

-- 4. O2PLUSS 운영사 테넌트 생성
INSERT INTO tenants (name) 
VALUES ('O2PLUSS')
ON CONFLICT DO NOTHING;

-- 5. 초기 운영자 사용자 생성
-- 이메일: admin@o2pluss.com
-- 비밀번호: admin123 (실제 운영 시 반드시 변경하세요!)
INSERT INTO users (email, password_hash, name) 
VALUES (
  'admin@o2pluss.com',
  '$2b$10$BEA2YsuOGgGRmmbsZdrKNOMP0Doz0UglrEp0hjSqlHhWS3hOQ1KtS', -- admin123의 해시
  'O2PLUSS 운영자'
)
ON CONFLICT (email) DO NOTHING;

-- 6. 운영자 사용자를 테넌트에 연결
INSERT INTO tenant_users (user_id, tenant_id, role)
SELECT 
  u.id,
  t.id,
  'operator_admin'
FROM users u
CROSS JOIN tenants t
WHERE u.email = 'admin@o2pluss.com'
  AND t.name = 'O2PLUSS'
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- ============================================
-- 완료!
-- ============================================
-- 로그인 정보:
-- 이메일: admin@o2pluss.com
-- 비밀번호: admin123
-- ============================================

