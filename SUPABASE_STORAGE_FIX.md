# Supabase Storage 엑셀 파일 업로드 문제 해결

## 문제
엑셀 파일 업로드 시 `mime type application/vnd.openxmlformats-officedocument.spreadsheetml.sheet is not supported` 오류 발생

## 해결 방법

### 방법 1: Supabase Storage 버킷 설정 변경 (권장)

1. Supabase 대시보드 > Storage > `reports` 버킷 클릭
2. Settings 탭으로 이동
3. "Restrict MIME types" 토글이 켜져 있는지 확인
4. "Allowed MIME types" 필드에 **쉼표(,)로 구분하여** 다음을 입력:

```
application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/octet-stream
```

**중요**: 
- 각 MIME type을 **쉼표(,)로 구분**하여 입력합니다
- 공백은 있어도 되지만, 쉼표는 필수입니다
- 예: `application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

**또는 더 간단한 방법**:
- "Restrict MIME types" 토글을 **끄기** (모든 파일 타입 허용)

### 방법 2: 코드 수정 (이미 적용됨)

코드에서 엑셀 파일의 경우 `contentType`을 제거하여 Supabase가 파일 확장자로 자동 감지하도록 변경했습니다.

## 추가 개선사항

- 파일 업로드 실패 시 보고서 레코드가 생성되지 않도록 수정
- 파일이 없는 보고서도 삭제 가능하도록 수정
- 파일 업로드 실패 시 생성된 점검 레코드도 자동 삭제

