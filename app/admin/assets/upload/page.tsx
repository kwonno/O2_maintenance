'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UploadResult {
  success: number
  failed: number
  errors: string[]
}

export default function AssetUploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      alert('파일을 선택해주세요.')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/assets/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '업로드에 실패했습니다.')
      }

      setResult(data)
      
      if (data.success > 0) {
        setTimeout(() => {
          router.push('/admin/assets')
        }, 2000)
      }
    } catch (error: any) {
      alert(error.message || '업로드에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const csv = `고객사,제조사,모델,시리얼번호,계약기간(시작),계약기간(종료),EOL,발주번호,비고
테스트,Extreme Networks,Summit X670-G2-48x-4q-Base-Unit,1632N-41045,2025-04-01,2026-03-31,2029-07-31,102503-00969,`

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', '자산_업로드_템플릿.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/assets" className="text-[#1A1A4D] hover:text-[#F12711] text-sm mb-4 inline-block">
          ← 자산 관리로
        </Link>
        <h1 className="text-2xl font-bold text-[#1A1A4D] mb-1">자산 일괄 업로드</h1>
        <p className="text-sm text-gray-600">CSV 파일을 업로드하여 자산과 계약을 자동으로 생성합니다</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#1A1A4D] mb-2">업로드 형식</h2>
          <p className="text-sm text-gray-600 mb-4">
            CSV 파일은 다음 컬럼을 포함해야 합니다:
          </p>
          <ul className="text-sm text-gray-700 space-y-1 mb-4">
            <li>• 고객사: 고객사 이름 (기존 고객사가 없으면 자동 생성)</li>
            <li>• 제조사: 제조사 이름</li>
            <li>• 모델: 모델명</li>
            <li>• 시리얼번호: 시리얼 번호</li>
            <li>• 계약기간(시작): YYYY-MM-DD 형식</li>
            <li>• 계약기간(종료): YYYY-MM-DD 형식</li>
            <li>• EOL: YYYY-MM-DD 형식 (선택사항)</li>
            <li>• 발주번호: 발주 번호 (선택사항)</li>
            <li>• 비고: 비고 사항 (선택사항)</li>
          </ul>
          <button
            onClick={downloadTemplate}
            className="px-4 py-2 text-sm bg-[#F3F3FB] text-[#1A1A4D] rounded-lg hover:bg-gray-200 transition-colors"
          >
            템플릿 다운로드
          </button>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CSV 파일 선택
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#1A1A4D] file:text-white hover:file:bg-[#0F0C29] file:cursor-pointer"
          />
        </div>

        <div className="mt-6">
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full px-4 py-2 bg-[#1A1A4D] text-white rounded-lg hover:bg-[#0F0C29] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '업로드 중...' : '업로드'}
          </button>
        </div>
      </div>

      {result && (
        <div className={`bg-white border rounded-lg p-6 shadow-sm ${
          result.success > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
        }`}>
          <h3 className={`text-lg font-semibold mb-2 ${
            result.success > 0 ? 'text-green-800' : 'text-red-800'
          }`}>
            업로드 결과
          </h3>
          <p className={`text-sm mb-2 ${
            result.success > 0 ? 'text-green-700' : 'text-red-700'
          }`}>
            성공: {result.success}개, 실패: {result.failed}개
          </p>
          {result.errors.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-red-800 mb-2">오류 목록:</p>
              <ul className="text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
                {result.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
          {result.success > 0 && (
            <p className="text-sm text-green-700 mt-4">
              2초 후 자산 관리 페이지로 이동합니다...
            </p>
          )}
        </div>
      )}
    </div>
  )
}




