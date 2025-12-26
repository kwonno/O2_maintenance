-- users 테이블 생성 (Supabase Auth 대신 사용)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- tenant_users의 외래키를 users로 변경
ALTER TABLE tenant_users 
  DROP CONSTRAINT IF EXISTS tenant_users_user_id_fkey;

ALTER TABLE tenant_users
  ADD CONSTRAINT tenant_users_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- inspections의 performed_by를 users로 변경
ALTER TABLE inspections
  DROP CONSTRAINT IF EXISTS inspections_performed_by_fkey;

ALTER TABLE inspections
  ADD CONSTRAINT inspections_performed_by_fkey
  FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL;

-- 인덱스
CREATE INDEX idx_users_email ON users(email);

