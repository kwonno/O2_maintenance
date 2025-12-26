-- ============================================
-- tenant_users 테이블 RLS 비활성화
-- ============================================
-- 자체 인증 시스템을 사용하므로 auth.uid()가 작동하지 않음
-- 애플리케이션 레벨에서 권한 체크를 수행하므로 RLS를 비활성화

-- 1. 기존 정책 삭제
DROP POLICY IF EXISTS "tenant_scope_tenant_users" ON tenant_users;
DROP POLICY IF EXISTS "operator_admin_tenant_users" ON tenant_users;

-- 2. RLS 비활성화 (서비스 역할 키를 사용하므로 RLS가 필요 없음)
ALTER TABLE tenant_users DISABLE ROW LEVEL SECURITY;

-- 참고: 다른 테이블의 RLS는 유지하되, tenant_users 조회는 서비스 역할 키를 사용합니다.
-- 이렇게 하면 무한 재귀 문제를 피하면서도 보안을 유지할 수 있습니다.

