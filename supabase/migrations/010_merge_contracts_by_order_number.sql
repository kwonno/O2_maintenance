-- 발주번호별로 계약 통합 마이그레이션
-- 같은 발주번호를 가진 자산들을 하나의 계약으로 묶기

-- 1. 발주번호별로 그룹화하여 계약 통합
DO $$
DECLARE
    order_group RECORD;
    merged_contract_id UUID;
    asset_record RECORD;
    old_contract_id UUID;
BEGIN
    -- 발주번호가 있고, 같은 고객사, 같은 계약기간을 가진 자산들을 그룹화
    FOR order_group IN
        SELECT DISTINCT
            a.tenant_id,
            a.order_number,
            c.start_date,
            c.end_date
        FROM assets a
        INNER JOIN contract_items ci ON ci.asset_id = a.id
        INNER JOIN contracts c ON c.id = ci.contract_id
        WHERE a.order_number IS NOT NULL 
          AND a.order_number != ''
          AND c.tenant_id = a.tenant_id
        GROUP BY a.tenant_id, a.order_number, c.start_date, c.end_date
        HAVING COUNT(DISTINCT c.id) > 1  -- 여러 계약이 있는 경우만
    LOOP
        -- 이 그룹에 속한 모든 계약 찾기
        WITH contract_ids AS (
            SELECT DISTINCT c.id
            FROM assets a
            INNER JOIN contract_items ci ON ci.asset_id = a.id
            INNER JOIN contracts c ON c.id = ci.contract_id
            WHERE a.tenant_id = order_group.tenant_id
              AND a.order_number = order_group.order_number
              AND c.start_date = order_group.start_date
              AND c.end_date = order_group.end_date
        )
        SELECT id INTO merged_contract_id
        FROM contract_ids
        ORDER BY created_at ASC
        LIMIT 1;  -- 가장 오래된 계약을 기준으로 사용

        -- 통합할 계약명 생성
        UPDATE contracts
        SET name = (
            SELECT t.name || ' - 발주번호: ' || order_group.order_number
            FROM tenants t
            WHERE t.id = order_group.tenant_id
        )
        WHERE id = merged_contract_id;

        -- 나머지 계약들의 contract_items를 통합 계약으로 이동
        FOR old_contract_id IN
            SELECT DISTINCT c.id
            FROM assets a
            INNER JOIN contract_items ci ON ci.asset_id = a.id
            INNER JOIN contracts c ON c.id = ci.contract_id
            WHERE a.tenant_id = order_group.tenant_id
              AND a.order_number = order_group.order_number
              AND c.start_date = order_group.start_date
              AND c.end_date = order_group.end_date
              AND c.id != merged_contract_id
        LOOP
            -- contract_items를 통합 계약으로 이동
            UPDATE contract_items
            SET contract_id = merged_contract_id,
                updated_at = NOW()
            WHERE contract_id = old_contract_id
              AND contract_id != merged_contract_id
              AND NOT EXISTS (
                  -- 중복 방지: 같은 asset_id가 이미 통합 계약에 있으면 제외
                  SELECT 1 FROM contract_items
                  WHERE contract_id = merged_contract_id
                    AND asset_id = contract_items.asset_id
              );

            -- 이동이 완료된 계약 삭제 (contract_items가 없는 경우만)
            DELETE FROM contracts
            WHERE id = old_contract_id
              AND NOT EXISTS (
                  SELECT 1 FROM contract_items WHERE contract_id = old_contract_id
              );
        END LOOP;
    END LOOP;
END $$;

-- 2. 통합 후 남은 개별 계약들도 발주번호 기반으로 이름 변경 (선택사항)
UPDATE contracts c
SET name = t.name || ' - 발주번호: ' || a.order_number
FROM contract_items ci
INNER JOIN assets a ON a.id = ci.asset_id
INNER JOIN tenants t ON t.id = c.tenant_id
WHERE c.id = ci.contract_id
  AND a.order_number IS NOT NULL
  AND a.order_number != ''
  AND c.name NOT LIKE '%발주번호:%'
  AND (
      -- 같은 계약에 속한 모든 자산이 같은 발주번호를 가지는 경우
      SELECT COUNT(DISTINCT a2.order_number)
      FROM contract_items ci2
      INNER JOIN assets a2 ON a2.id = ci2.asset_id
      WHERE ci2.contract_id = c.id
        AND a2.order_number IS NOT NULL
        AND a2.order_number != ''
  ) = 1;

