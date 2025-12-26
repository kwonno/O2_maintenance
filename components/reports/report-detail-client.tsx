'use client'

import { useState } from 'react'
import SignatureModal from './signature-modal'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface ReportDetailClientProps {
  report: any
  signedUrl: string | null
  canSign: boolean
}

export default function ReportDetailClient({ report, signedUrl, canSign }: ReportDetailClientProps) {
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false)
  const [signatureStatus, setSignatureStatus] = useState(report.signature_status || 'pending')
  const [signatureData, setSignatureData] = useState(report.signature_data || null)

  const handleSaveSignature = async (signatureData: string, signatureType: 'draw' | 'upload', position: { x: number; y: number; page: number }) => {
    try {
      const response = await fetch(`/api/reports/${report.id}/signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signatureData,
          signatureType,
          position: position || report.signature_position || { x: 0, y: 0, page: 1 },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '서명 저장에 실패했습니다.')
      }

      setSignatureStatus('signed')
      setSignatureData(signatureData)
      setIsSignatureModalOpen(false)
      alert('서명이 저장되었습니다.')
      window.location.reload() // 페이지 새로고침
    } catch (error: any) {
      alert(error.message || '서명 저장에 실패했습니다.')
    }
  }

  return (
    <>
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold text-[#1A1A4D]">
              {report.inspection?.yyyy_mm} 점검 보고서
            </h1>
            {canSign && signatureStatus === 'pending' && (
              <button
                onClick={() => setIsSignatureModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-[#F12711] text-white font-semibold rounded-lg hover:bg-[#D6220F] transition-colors shadow-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                검수하기
              </button>
            )}
          </div>

          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 mb-6">
            <div>
              <dt className="text-sm font-medium text-gray-500">점검일</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {report.inspection?.inspection_date && format(new Date(report.inspection.inspection_date), 'yyyy년 MM월 dd일', { locale: ko })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">보고서 ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{report.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">서명 상태</dt>
              <dd className="mt-1">
                {signatureStatus === 'signed' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    서명 완료
                  </span>
                ) : signatureStatus === 'rejected' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    반려됨
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    대기 중
                  </span>
                )}
              </dd>
            </div>
            {report.signed_at && (
              <div>
                <dt className="text-sm font-medium text-gray-500">서명일시</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(report.signed_at), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
                </dd>
              </div>
            )}
          </dl>

          {report.summary && (
            <div className="mb-6">
              <dt className="text-sm font-medium text-gray-500 mb-2">요약</dt>
              <dd className="text-sm text-gray-900">{report.summary}</dd>
            </div>
          )}

          {signatureData && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <dt className="text-sm font-medium text-gray-500 mb-2">서명</dt>
              <dd>
                <img src={signatureData} alt="서명" className="max-w-xs h-auto border border-gray-300 rounded" />
              </dd>
            </div>
          )}

          {signedUrl && (
            <div className="space-y-4">
              <div>
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1A1A4D] hover:bg-[#0F0C29]"
                >
                  {report.file_type === 'pdf' ? 'PDF' : '파일'} 열기
                </a>
                <a
                  href={signedUrl}
                  download={`${report.inspection?.yyyy_mm || 'report'}_점검보고서.${report.file_type || 'pdf'}`}
                  className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  다운로드
                </a>
              </div>
              {report.file_type === 'pdf' ? (
                <div className="mt-4 relative">
                  <iframe
                    src={signedUrl}
                    className="w-full h-screen border border-gray-300 rounded"
                    title="보고서 PDF"
                  />
                  {signatureData && report.signature_position && (
                    <div
                      className="absolute pointer-events-none z-10"
                      style={{
                        left: `${report.signature_position.x}px`,
                        top: `${report.signature_position.y}px`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <img 
                        src={signatureData} 
                        alt="서명" 
                        className="max-w-[150px] h-auto border-2 border-red-500 rounded shadow-lg bg-white p-1"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    엑셀 파일은 다운로드하여 확인해주세요.
                  </p>
                </div>
              )}
            </div>
          )}

          {!signedUrl && report.file_path && (
            <div className="text-sm text-red-600">
              보고서 파일을 불러올 수 없습니다.
            </div>
          )}
          
          {!report.file_path && (
            <div className="text-sm text-gray-500">
              보고서 파일이 업로드되지 않았습니다.
            </div>
          )}
        </div>
      </div>

      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={handleSaveSignature}
        reportId={report.id}
        defaultPosition={report.signature_position || { x: 0, y: 0, page: 1 }}
      />
    </>
  )
}

