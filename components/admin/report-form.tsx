'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Tenant {
  id: string
  name: string
}

export default function ReportForm({ tenants }: { tenants: Tenant[] }) {
  const [formData, setFormData] = useState({
    tenant_id: tenants[0]?.id || '',
    yyyy_mm: '',
    inspection_date: new Date().toISOString().split('T')[0],
    summary: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // 점검 생성
      const { data: inspection, error: inspectionError } = await supabase
        .from('inspections')
        .insert({
          tenant_id: formData.tenant_id,
          yyyy_mm: formData.yyyy_mm,
          inspection_date: formData.inspection_date,
          performed_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single()

      if (inspectionError) throw inspectionError

      // 파일 업로드
      if (file) {
        const reportId = crypto.randomUUID()
        const filePath = `tenant/${formData.tenant_id}/inspections/${formData.yyyy_mm}/${reportId}.pdf`
        
        const { error: uploadError } = await supabase.storage
          .from('reports')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) throw uploadError

        // 보고서 레코드 생성
        const { error: reportError } = await supabase
          .from('inspection_reports')
          .insert({
            tenant_id: formData.tenant_id,
            inspection_id: inspection.id,
            file_path: filePath,
            summary: formData.summary || null,
          })

        if (reportError) throw reportError
      }

      setMessage('점검 및 보고서가 생성되었습니다.')
      setFormData({
        tenant_id: tenants[0]?.id || '',
        yyyy_mm: '',
        inspection_date: new Date().toISOString().split('T')[0],
        summary: '',
      })
      setFile(null)
      router.refresh()
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
            보고서 PDF
          </label>
          <input
            id="file"
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
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

