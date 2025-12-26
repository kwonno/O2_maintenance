'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface MergeResult {
  success: boolean
  merged: number
  errors: string[]
}

export default function ContractMergePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MergeResult | null>(null)

  const handleMerge = async () => {
    if (!confirm('발주번호별로 계약을 통합하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/contracts/merge', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '계약 통합에 실패했습니다.')
      }

      setResult(data)
      
      if (data.success) {
        setTimeout(() => {
          router.push('/admin/contracts')
        }, 2000)
      }
    } catch (error: any) {
      setResult({
        success: false,
        merged: 0,
        errors: [error.message || '계약 통합에 실패했습니다.'],
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/contracts" className="text-[#1A1A4D] hover:text-[#F12711] text-sm mb-4 inline-block">
          ← 계약 관리로
        </Link>
        <h1 className="text-2xl font-bold text-[#1A1A4D] mb-1">계약 통합</h1>
        <p className="text-sm text-gray-600">발주번호가 동일한 자산들을 하나의 계약으로 통합합니다</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[#1A1A4D] mb-2">통합 규칙</h2>
          <ul className="text-sm text-gray-700 space-y-2">
            <li>• 같은 발주번호를 가진 자산들이 여러 계약에 분산되어 있으면 하나로 통합</li>
            <li>• 같은 고객사, 같은 계약기간(시작/종료), 같은 발주번호를 기준으로 통합</li>
            <li>• 통합된 계약명은 &quot;{'{고객사}'} - 발주번호: {'{발주번호}'}&quot; 형식으로 변경</li>
            <li>• 중복된 계약은 삭제되고 자산들은 하나의 계약으로 연결</li>
          </ul>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <button
            onClick={handleMerge}
            disabled={loading}
            className="w-full px-4 py-2 bg-[#1A1A4D] text-white rounded-lg hover:bg-[#0F0C29] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '통합 중...' : '계약 통합 실행'}
          </button>
        </div>
      </div>

      {result && (
        <div className={`bg-white border rounded-lg p-6 shadow-sm ${
          result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
        }`}>
          <h3 className={`text-lg font-semibold mb-2 ${
            result.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {result.success ? '통합 완료' : '통합 실패'}
          </h3>
          <p className={`text-sm mb-2 ${
            result.success ? 'text-green-700' : 'text-red-700'
          }`}>
            통합된 계약 그룹: {result.merged}개
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
          {result.success && (
            <p className="text-sm text-green-700 mt-4">
              2초 후 계약 관리 페이지로 이동합니다...
            </p>
          )}
        </div>
      )}
    </div>
  )
}

