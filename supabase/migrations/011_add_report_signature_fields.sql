-- inspection_reports 테이블에 서명 관련 필드 추가
ALTER TABLE inspection_reports
  ADD COLUMN IF NOT EXISTS signature_path TEXT,
  ADD COLUMN IF NOT EXISTS signature_data TEXT, -- base64 인코딩된 서명 이미지
  ADD COLUMN IF NOT EXISTS signature_status TEXT DEFAULT 'pending', -- pending, signed, rejected
  ADD COLUMN IF NOT EXISTS signature_position JSONB, -- {x: number, y: number, page: number}
  ADD COLUMN IF NOT EXISTS signed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT 'pdf'; -- pdf, xlsx, xls

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_inspection_reports_signature_status ON inspection_reports(signature_status);
CREATE INDEX IF NOT EXISTS idx_inspection_reports_file_type ON inspection_reports(file_type);

