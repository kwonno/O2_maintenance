-- 제조사, 모델, 위치를 정형화하기 위한 테이블 생성

-- 제조사 테이블
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 모델 테이블 (제조사별)
CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vendor_id, name)
);

-- 위치 테이블
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_models_vendor_id ON models(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);

-- RLS 정책 (모든 사용자가 읽을 수 있음, 관리자만 수정 가능)
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있음
CREATE POLICY "vendors_select_all" ON vendors FOR SELECT USING (true);
CREATE POLICY "models_select_all" ON models FOR SELECT USING (true);
CREATE POLICY "locations_select_all" ON locations FOR SELECT USING (true);

-- 관리자만 수정 가능 (tenant_users에서 operator_admin 역할 확인)
CREATE POLICY "vendors_insert_admin" ON vendors FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid()::text 
      AND role = 'operator_admin'
    )
  );

CREATE POLICY "vendors_update_admin" ON vendors FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid()::text 
      AND role = 'operator_admin'
    )
  );

CREATE POLICY "vendors_delete_admin" ON vendors FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid()::text 
      AND role = 'operator_admin'
    )
  );

CREATE POLICY "models_insert_admin" ON models FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid()::text 
      AND role = 'operator_admin'
    )
  );

CREATE POLICY "models_update_admin" ON models FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid()::text 
      AND role = 'operator_admin'
    )
  );

CREATE POLICY "models_delete_admin" ON models FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid()::text 
      AND role = 'operator_admin'
    )
  );

CREATE POLICY "locations_insert_admin" ON locations FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid()::text 
      AND role = 'operator_admin'
    )
  );

CREATE POLICY "locations_update_admin" ON locations FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid()::text 
      AND role = 'operator_admin'
    )
  );

CREATE POLICY "locations_delete_admin" ON locations FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users 
      WHERE user_id = auth.uid()::text 
      AND role = 'operator_admin'
    )
  );

