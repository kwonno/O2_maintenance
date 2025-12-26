-- ============================================
-- RLS 무한 재귀 문제 수정
-- ============================================
-- tenant_users 테이블의 정책이 자기 자신을 참조하여 무한 재귀 발생
-- 이 스크립트로 기존 정책을 삭제하고 수정된 정책으로 재생성

-- 1. 기존 정책 삭제
DROP POLICY IF EXISTS "tenant_scope_tenant_users" ON tenant_users;
DROP POLICY IF EXISTS "operator_admin_tenant_users" ON tenant_users;

-- 2. 수정된 정책 생성 (무한 재귀 방지)
-- 사용자는 자신의 tenant_users 레코드만 조회 가능
CREATE POLICY "tenant_scope_tenant_users" ON tenant_users
  FOR SELECT
  USING (user_id = auth.uid()::text);

-- operator_admin은 모든 tenant_users 조회 가능
-- 하지만 자기 자신을 참조하지 않도록 주의
CREATE POLICY "operator_admin_tenant_users" ON tenant_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.user_id = auth.uid()::text 
      AND tu.role = 'operator_admin'
      -- 무한 재귀 방지: 현재 행과 다른 행만 참조
      AND tu.id != tenant_users.id
    )
  );

-- 참고: auth.uid()는 Supabase Auth를 사용할 때만 작동합니다.
-- 현재는 자체 인증을 사용하므로, RLS를 완전히 비활성화하거나
-- 서비스 역할 키를 사용해야 합니다.

