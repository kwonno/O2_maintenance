-- RLS 활성화
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_reports ENABLE ROW LEVEL SECURITY;

-- 테넌트 스코프: 로그인 유저는 tenant_users에 있는 tenant_id만 접근 가능
CREATE POLICY "tenant_scope_tenants" ON tenants
  FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_scope_tenant_users" ON tenant_users
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "tenant_scope_assets" ON assets
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_scope_contracts" ON contracts
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_scope_contract_items" ON contract_items
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_scope_inspections" ON inspections
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_scope_inspection_reports" ON inspection_reports
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- operator_admin: operator_admin은 모든 tenant 접근 가능
CREATE POLICY "operator_admin_tenants" ON tenants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE user_id = auth.uid() AND role = 'operator_admin'
    )
  );

CREATE POLICY "operator_admin_tenant_users" ON tenant_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE user_id = auth.uid() AND role = 'operator_admin'
    )
  );

CREATE POLICY "operator_admin_assets" ON assets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE user_id = auth.uid() AND role = 'operator_admin'
    )
  );

CREATE POLICY "operator_admin_contracts" ON contracts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE user_id = auth.uid() AND role = 'operator_admin'
    )
  );

CREATE POLICY "operator_admin_contract_items" ON contract_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE user_id = auth.uid() AND role = 'operator_admin'
    )
  );

CREATE POLICY "operator_admin_inspections" ON inspections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE user_id = auth.uid() AND role = 'operator_admin'
    )
  );

CREATE POLICY "operator_admin_inspection_reports" ON inspection_reports
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users
      WHERE user_id = auth.uid() AND role = 'operator_admin'
    )
  );

