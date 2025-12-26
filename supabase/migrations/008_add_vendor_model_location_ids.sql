-- assets 테이블에 vendor_id, model_id, location_id 추가
-- 기존 vendor, model, location 컬럼은 호환성을 위해 유지

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS model_id UUID REFERENCES models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_assets_vendor_id ON assets(vendor_id);
CREATE INDEX IF NOT EXISTS idx_assets_model_id ON assets(model_id);
CREATE INDEX IF NOT EXISTS idx_assets_location_id ON assets(location_id);

