-- inspection_reports 테이블에 title 필드 추가
ALTER TABLE inspection_reports
  ADD COLUMN IF NOT EXISTS title TEXT;

-- 기존 yyyy_mm 값을 title로 복사 (임시)
UPDATE inspection_reports
SET title = inspection_reports.inspection_id::text || ' - ' || (
  SELECT yyyy_mm 
  FROM inspections 
  WHERE inspections.id = inspection_reports.inspection_id
)
WHERE title IS NULL;

-- inspections 테이블에도 title 필드 추가 (선택사항, 나중에 yyyy_mm 대체 가능)
ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS title TEXT;


