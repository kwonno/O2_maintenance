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
-- 주의: 커스텀 인증 시스템을 사용하므로 RLS는 비활성화하고 애플리케이션 레벨에서 권한 체크
-- 또는 모든 사용자가 읽을 수 있도록 설정 (수정은 API에서 권한 체크)

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽을 수 있음
CREATE POLICY "vendors_select_all" ON vendors FOR SELECT USING (true);
CREATE POLICY "models_select_all" ON models FOR SELECT USING (true);
CREATE POLICY "locations_select_all" ON locations FOR SELECT USING (true);

-- 수정/삭제는 RLS로 제한하지 않고 API 레벨에서 권한 체크
-- (커스텀 인증 시스템에서는 auth.uid()를 사용할 수 없음)
CREATE POLICY "vendors_insert_all" ON vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "vendors_update_all" ON vendors FOR UPDATE USING (true);
CREATE POLICY "vendors_delete_all" ON vendors FOR DELETE USING (true);

CREATE POLICY "models_insert_all" ON models FOR INSERT WITH CHECK (true);
CREATE POLICY "models_update_all" ON models FOR UPDATE USING (true);
CREATE POLICY "models_delete_all" ON models FOR DELETE USING (true);

CREATE POLICY "locations_insert_all" ON locations FOR INSERT WITH CHECK (true);
CREATE POLICY "locations_update_all" ON locations FOR UPDATE USING (true);
CREATE POLICY "locations_delete_all" ON locations FOR DELETE USING (true);

