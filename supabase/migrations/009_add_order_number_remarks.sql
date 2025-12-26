-- assets 테이블에 발주번호와 비고 컬럼 추가
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS order_number TEXT,
  ADD COLUMN IF NOT EXISTS remarks TEXT;

-- 인덱스 추가 (발주번호로 검색 가능하도록)
CREATE INDEX IF NOT EXISTS idx_assets_order_number ON assets(order_number);

