# Supabase 설정 가이드

## 1. 데이터베이스 마이그레이션

Supabase 대시보드에서 SQL Editor를 열고 다음 순서로 실행:

### 1단계: 테이블 생성
`supabase/migrations/001_initial_schema.sql` 파일의 내용을 복사하여 실행

### 2단계: RLS 정책 설정
`supabase/migrations/002_rls_policies.sql` 파일의 내용을 복사하여 실행

## 2. Storage 버킷 생성

1. Supabase 대시보드 > Storage
2. "Create Bucket" 클릭
3. 설정:
   - **Bucket name**: `reports`
   - **Public bucket**: **체크 해제** (비공개)
   - **File size limit**: 10MB (또는 적절한 값)
   - **Allowed MIME types**: `application/pdf` (선택사항)
4. "Create bucket" 클릭

## 3. Storage 정책 설정 (선택사항)

Storage 버킷에 대한 RLS 정책을 설정하려면:

```sql
-- reports 버킷에 대한 정책
CREATE POLICY "Users can upload reports for their tenant"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'reports' AND
  (storage.foldername(name))[1] = 'tenant' AND
  (storage.foldername(name))[2] IN (
    SELECT tenant_id::text FROM tenant_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view reports for their tenant"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'reports' AND
  (storage.foldername(name))[1] = 'tenant' AND
  (storage.foldername(name))[2] IN (
    SELECT tenant_id::text FROM tenant_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Operator admins can manage all reports"
ON storage.objects FOR ALL
USING (
  bucket_id = 'reports' AND
  EXISTS (
    SELECT 1 FROM tenant_users
    WHERE user_id = auth.uid() AND role = 'operator_admin'
  )
);
```

## 4. 초기 데이터 설정

### 테넌트 생성 및 사용자 연결

1. Supabase 대시보드 > Authentication > Users에서 사용자 생성 또는 기존 사용자 확인
2. SQL Editor에서 다음 쿼리 실행 (예시):

```sql
-- 테넌트 생성
INSERT INTO tenants (name) VALUES ('테스트 고객사');

-- 사용자를 테넌트에 연결 (customer 역할)
INSERT INTO tenant_users (user_id, tenant_id, role)
VALUES (
  '사용자_UUID',  -- auth.users 테이블의 id
  (SELECT id FROM tenants WHERE name = '테스트 고객사'),
  'customer'
);

-- 운영자 계정을 모든 테넌트에 operator_admin으로 추가
INSERT INTO tenant_users (user_id, tenant_id, role)
SELECT 
  '운영자_UUID',  -- operator_admin 사용자의 UUID
  id,
  'operator_admin'
FROM tenants;
```

## 5. 환경 변수 확인

프로젝트의 `.env.local` 파일에 다음이 설정되어 있습니다:

```
NEXT_PUBLIC_SUPABASE_URL=https://kmcublgfunuyjxbzoxiy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_flBw06pnBkv97E_rcl4uQw_N8aAVZ8l
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttY3VibGdmdW51eWp4YnpveGl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjU2NTQ4MCwiZXhwIjoyMDgyMTQxNDgwfQ.WQSQ4iL7VVwd82iuTHEBF_PMi9Rm_hhyTcsguiKZAq8
```

> **참고**: Supabase의 새로운 API 키 시스템을 사용 중입니다. Publishable key를 사용하거나, 필요시 Legacy anon key도 사용 가능합니다.

