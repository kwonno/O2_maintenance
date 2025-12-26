'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FilePreviewWithSignature from './file-preview-with-signature'

interface Tenant {
  id: string
  name: string
}

export default function ReportForm({ tenants, onSuccess }: { tenants: Tenant[], onSuccess?: () => void }) {
  const [formData, setFormData] = useState({
    tenant_id: tenants[0]?.id || '',
    yyyy_mm: '',
    inspection_date: new Date().toISOString().split('T')[0],
    summary: '',
    signature_position_x: 0,
    signature_position_y: 0,
    signature_position_page: 1,
  })
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // 현재 사용자 정보 가져오기
      const userRes = await fetch('/api/auth/check')
      const userData = await userRes.json()
      
      if (!userData.authenticated || !userData.user) {
        throw new Error('인증이 필요합니다.')
      }

      // API를 통해 점검 및 보고서 생성
      const formDataToSend = new FormData()
      formDataToSend.append('tenant_id', formData.tenant_id)
      formDataToSend.append('yyyy_mm', formData.yyyy_mm)
      formDataToSend.append('inspection_date', formData.inspection_date)
      formDataToSend.append('summary', formData.summary || '')
      formDataToSend.append('signature_position_x', formData.signature_position_x.toString())
      formDataToSend.append('signature_position_y', formData.signature_position_y.toString())
      formDataToSend.append('signature_position_page', formData.signature_position_page.toString())
      if (file) {
        formDataToSend.append('file', file)
      }

      const response = await fetch('/api/admin/reports', {
        method: 'POST',
        body: formDataToSend,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '보고서 생성에 실패했습니다.')
      }

      setMessage('점검 및 보고서가 생성되었습니다.')
      setFormData({
        tenant_id: tenants[0]?.id || '',
        yyyy_mm: '',
        inspection_date: new Date().toISOString().split('T')[0],
        summary: '',
        signature_position_x: 0,
        signature_position_y: 0,
        signature_position_page: 1,
      })
      setFile(null)
      router.refresh()
      if (onSuccess) {
        setTimeout(() => onSuccess(), 500)
      }
    } catch (error: any) {
      setMessage(error.message || '보고서 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="tenant_id" className="block text-sm font-medium text-gray-700">
            고객사
          </label>
          <select
            id="tenant_id"
            required
            value={formData.tenant_id}
            onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {tenants.map(tenant => (
              <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="yyyy_mm" className="block text-sm font-medium text-gray-700">
            년월 (yyyy_mm 형식)
          </label>
          <input
            id="yyyy_mm"
            type="text"
            required
            placeholder="2024_01"
            value={formData.yyyy_mm}
            onChange={(e) => setFormData({ ...formData, yyyy_mm: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="inspection_date" className="block text-sm font-medium text-gray-700">
            점검일
          </label>
          <input
            id="inspection_date"
            type="date"
            required
            value={formData.inspection_date}
            onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="file" className="block text-sm font-medium text-gray-700">
            보고서 파일 (PDF 또는 엑셀)
          </label>
          <input
            id="file"
            type="file"
            accept=".pdf,.xlsx,.xls"
            onChange={(e) => {
              const selectedFile = e.target.files?.[0] || null
              setFile(selectedFile)
              // 파일 변경 시 위치 초기화
              if (selectedFile) {
                setFormData({
                  ...formData,
                  signature_position_x: 0,
                  signature_position_y: 0,
                  signature_position_page: 1,
                })
              }
            }}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p className="mt-1 text-xs text-gray-500">PDF, XLSX, XLS 파일을 업로드할 수 있습니다.</p>
        </div>
      </div>
      <div>
        <label htmlFor="summary" className="block text-sm font-medium text-gray-700">
          요약
        </label>
        <textarea
          id="summary"
          rows={3}
          value={formData.summary}
          onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      {file && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">서명 위치 설정</h3>
          <p className="text-xs text-gray-600 mb-3">
            아래 미리보기에서 서명할 위치를 클릭하세요. 클릭한 위치가 자동으로 설정됩니다.
          </p>
          <FilePreviewWithSignature
            file={file}
            onPositionSelect={(position) => {
              setFormData({
                ...formData,
                signature_position_x: position.x,
                signature_position_y: position.y,
                signature_position_page: position.page,
              })
            }}
            currentPosition={{
              x: formData.signature_position_x,
              y: formData.signature_position_y,
              page: formData.signature_position_page,
            }}
          />
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="signature_position_x" className="block text-xs font-medium text-gray-700">
                X 좌표
              </label>
              <input
                id="signature_position_x"
                type="number"
                value={formData.signature_position_x}
                onChange={(e) => setFormData({ ...formData, signature_position_x: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="signature_position_y" className="block text-xs font-medium text-gray-700">
                Y 좌표
              </label>
              <input
                id="signature_position_y"
                type="number"
                value={formData.signature_position_y}
                onChange={(e) => setFormData({ ...formData, signature_position_y: parseInt(e.target.value) || 0 })}
                className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="signature_position_page" className="block text-xs font-medium text-gray-700">
                페이지 번호
              </label>
              <input
                id="signature_position_page"
                type="number"
                min="1"
                value={formData.signature_position_page}
                onChange={(e) => setFormData({ ...formData, signature_position_page: parseInt(e.target.value) || 1 })}
                className="mt-1 block w-full px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className={`p-3 rounded ${message.includes('실패') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? '생성 중...' : '점검 및 보고서 생성'}
      </button>
    </form>
  )
}

