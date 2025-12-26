# Supabase Storage 엑셀 파일 업로드 문제 해결

## 문제
엑셀 파일 업로드 시 `mime type application/vnd.openxmlformats-officedocument.spreadsheetml.sheet is not supported` 오류 발생

## 해결 방법

### 방법 1: Supabase Storage 버킷 설정 변경 (권장)

1. Supabase 대시보드 > Storage > `reports` 버킷 클릭
2. Settings 탭으로 이동
3. "Allowed MIME types" 필드 확인
4. 다음 중 하나 선택:
   - **옵션 A**: 필드를 비워두기 (모든 파일 타입 허용) - 가장 간단
   - **옵션 B**: 다음 MIME types 추가:
     - `application/pdf`
     - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (엑셀 .xlsx)
     - `application/vnd.ms-excel` (엑셀 .xls)
     - `application/octet-stream` (일반 바이너리)

### 방법 2: 코드 수정 (이미 적용됨)

코드에서 엑셀 파일의 경우 `contentType`을 제거하여 Supabase가 파일 확장자로 자동 감지하도록 변경했습니다.

## 추가 개선사항

- 파일 업로드 실패 시 보고서 레코드가 생성되지 않도록 수정
- 파일이 없는 보고서도 삭제 가능하도록 수정
- 파일 업로드 실패 시 생성된 점검 레코드도 자동 삭제

