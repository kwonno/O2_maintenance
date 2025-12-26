# O2 IT Maintenance - MVP

Next.js 기반 IT 유지보수 관리 시스템 (MVP)

## 기술 스택

- **Framework**: Next.js 14.2.5 (App Router)
- **Database**: Supabase (PostgreSQL + RLS)
- **Storage**: Supabase Storage (reports 버킷)
- **Deployment**: Vercel
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand

## MVP 구조

### 필수 결정사항

1. **테넌트 구조**: 사용자 1명 = 1개 테넌트만 (MVP)
2. **역할**: customer / operator_admin만 (파트너/고객관리자는 Phase)
3. **계약 매핑**: 계약은 자산별 커버(contract_items)로 관리
4. **EOS**: 자산에 eos/eol 날짜 직접 저장 (eos_catalog는 Phase)
5. **보고서**: 월 점검은 yyyy_mm 키로 관리 + PDF만
6. **파일 정책**: reports 버킷 + 경로 고정 `tenant/{tenant_id}/inspections/{yyyy_mm}/{report_id}.pdf`
7. **알림**: MVP는 화면 배지/필터만 (메일 알림은 Phase)

### 데이터베이스 스키마 (6개 테이블)

1. `tenants` - 고객사
2. `tenant_users` - user_id, tenant_id, role
3. `assets` - 자산 (tenant_id, vendor, model, serial, alias, location, status, eos_date/eol_date)
4. `contracts` - 계약 (tenant_id, name, start_date, end_date)
5. `contract_items` - 계약 항목 (tenant_id, contract_id, asset_id, coverage_tier)
6. `inspections` - 점검 (tenant_id, yyyy_mm, performed_by, inspection_date)
7. `inspection_reports` - 점검 보고서 (tenant_id, inspection_id, file_path, summary)

### RLS 정책 (2개)

1. **tenant scope**: 로그인 유저는 tenant_users에 있는 tenant_id만 접근 가능
2. **operator_admin**: operator_admin은 모든 tenant 접근 가능

## 환경 설정

### 1. 로컬 개발 환경 설정

1. 저장소 클론
```bash
git clone https://github.com/kwonno/O2_maintenance.git
cd O2_IT_Maintenance
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정
`.env.example` 파일을 복사하여 `.env.local` 파일을 생성하고 Supabase 정보를 입력하세요.

```bash
cp .env.example .env.local
```

`.env.local` 파일에 다음 정보를 입력:
```
NEXT_PUBLIC_SUPABASE_URL=https://kmcublgfunuyjxbzoxiy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_flBw06pnBkv97E_rcl4uQw_N8aAVZ8l
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttY3VibGdmdW51eWp4YnpveGl5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjU2NTQ4MCwiZXhwIjoyMDgyMTQxNDgwfQ.WQSQ4iL7VVwd82iuTHEBF_PMi9Rm_hhyTcsguiKZAq8
```

> **참고**: Supabase의 새로운 API 키 시스템을 사용 중입니다. Publishable key를 사용하거나, 필요시 Legacy anon key도 사용 가능합니다.

4. Supabase 데이터베이스 설정

Supabase 대시보드에서 SQL Editor를 열고 다음 마이그레이션 파일을 순서대로 실행:

1. `supabase/migrations/001_initial_schema.sql` - 테이블 생성
2. `supabase/migrations/002_rls_policies.sql` - RLS 정책 설정

5. Supabase Storage 설정

Supabase 대시보드에서:
- Storage > Create Bucket
- Bucket 이름: `reports`
- Public bucket: **비공개** (체크 해제)
- File size limit: 적절한 값 설정 (예: 10MB)

6. 개발 서버 실행
```bash
npm run dev
```

### 2. Supabase 설정

프로젝트가 이미 설정되어 있습니다:
- **Project URL**: `https://kmcublgfunuyjxbzoxiy.supabase.co`
- **Publishable Key**: `sb_publishable_flBw06pnBkv97E_rcl4uQw_N8aAVZ8l` (새로운 형식)
- **Service Role Key**: Legacy JWT 형식 (서버 사이드 전용)

> **중요**: Service Role Key는 절대 클라이언트에 노출하지 마세요. 서버 사이드에서만 사용합니다.

### 3. Vercel 배포 설정

#### Vercel 대시보드를 통한 배포

1. [Vercel](https://vercel.com)에 로그인
2. "Add New Project" 클릭
3. GitHub/GitLab/Bitbucket 저장소 연결
4. 프로젝트 설정:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
5. 환경 변수 추가:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://kmcublgfunuyjxbzoxiy.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `sb_publishable_flBw06pnBkv97E_rcl4uQw_N8aAVZ8l`
   - `SUPABASE_SERVICE_ROLE_KEY`: Legacy service_role JWT key
6. "Deploy" 클릭

## MVP 화면

### 고객 포털 (5개)

1. **/login** - 로그인 (이메일+매직링크 or 비밀번호)
2. **/app** - 대시보드 (자산 수, 최근 보고서)
3. **/app/assets** - 자산 목록 + 검색/필터 + 상세
4. **/app/contracts** - 계약 리스트 + 종료일 배지 + 상세
5. **/app/reports** - 월별 보고서 리스트 + PDF 보기/다운로드

### 관리자 화면 (3개)

1. **/admin/tenants** - 테넌트 생성 및 관리
2. **/admin/assets** - 자산 CRUD
3. **/admin/reports** - 점검 생성 및 보고서 업로드

## 필수 테스트 시나리오

1. ✅ 고객 A로 로그인 → 고객 B 자산/보고서 URL 직접 접근 시 403/빈값
2. ✅ operator_admin은 모든 테넌트 조회 가능
3. ✅ 보고서 signed URL 만료 후 접근 불가
4. ✅ 계약 종료일 기준 "만료임박" 필터/배지 정상
5. ✅ 자산 상세에서 연결된 계약(contract_items) 정확히 표시
6. ✅ 월별 보고서(yyyy_mm) 정렬/필터 정상

## Git 설정

프로젝트를 Git에 푸시하기 전에 다음을 확인하세요:

1. `.gitignore` 파일이 올바르게 설정되어 있는지 확인
2. `.env.local` 파일이 Git에 커밋되지 않도록 확인
3. 초기 커밋:
```bash
git init
git add .
git commit -m "Initial commit: MVP structure"
git remote add origin <your-repository-url>
git push -u origin main
```

## 환경 변수 설명

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL (클라이언트/서버 모두 사용)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase 공개 키 (클라이언트/서버 모두 사용)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase 서비스 역할 키 (서버 사이드 전용, 민감한 작업용)

## 주의사항

- `.env.local` 파일은 절대 Git에 커밋하지 마세요
- `SUPABASE_SERVICE_ROLE_KEY`는 서버 사이드에서만 사용하고 클라이언트에 노출하지 마세요
- Vercel 환경 변수는 Production, Preview, Development 환경별로 설정할 수 있습니다
- Storage 버킷은 **비공개**로 설정하고 signed URL만 사용하세요

## 개발 스크립트

- `npm run dev`: 개발 서버 실행
- `npm run build`: 프로덕션 빌드
- `npm run start`: 프로덕션 서버 실행
- `npm run lint`: ESLint 실행

## Phase 1.5 (운영 효율 3종)

MVP 완료 후 추가 예정:
1. CSV 내보내기 (assets/contracts/contract_items)
2. 담당자 표시 (tenant_contacts)
3. 체크리스트 템플릿 (inspection 체크 결과 구조화)
