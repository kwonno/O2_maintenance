-- 서명자 이름 및 텍스트 위치 필드 추가
ALTER TABLE inspection_reports
ADD COLUMN IF NOT EXISTS signature_name TEXT,
ADD COLUMN IF NOT EXISTS text_position JSONB, -- { x: number, y: number, text: string }
ADD COLUMN IF NOT EXISTS name_position_x NUMERIC,
ADD COLUMN IF NOT EXISTS name_position_y NUMERIC;

