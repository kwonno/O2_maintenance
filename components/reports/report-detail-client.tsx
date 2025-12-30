'use client'

import { useState, useEffect, useRef } from 'react'
import SignatureModal from './signature-modal'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import * as pdfjsLib from 'pdfjs-dist'

// PDF.js worker 설정 - 로컬 파일 사용 (가장 안정적)
if (typeof window !== 'undefined') {
  // 로컬 public 폴더의 worker 파일 사용 (CDN 문제 방지)
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
}

// PDF 뷰어 컴포넌트 (PDF.js 사용)
function PdfViewerWithSignature({ 
  pdfUrl, 
  signatureData, 
  position,
  onPositionClick
}: { 
  pdfUrl: string
  signatureData: string | null
  position: { x: number; y: number; page: number } | null
  onPositionClick?: (position: { x: number; y: number; page: number }) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [calculatedScale, setCalculatedScale] = useState<number>(1.0) // 자동 계산된 scale
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [pageViewport, setPageViewport] = useState<any>(null)

  useEffect(() => {
    if (position) {
      setCurrentPage(position.page)
    }
  }, [position])

  useEffect(() => {
    const loadPdf = async () => {
      try {
        // CORS 문제를 피하기 위해 옵션 추가
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          withCredentials: false,
        })
        const pdf = await loadingTask.promise
        setPdfDoc(pdf)
        setTotalPages(pdf.numPages)
        
        if (position && position.page > 0 && position.page <= pdf.numPages) {
          setCurrentPage(position.page)
        } else {
          setCurrentPage(1)
        }
      } catch (error: any) {
        console.error('PDF 로드 실패:', error)
        // 에러 발생 시 사용자에게 알림
        alert(`PDF를 불러올 수 없습니다: ${error.message || '알 수 없는 오류'}`)
      }
    }

    if (pdfUrl) {
      loadPdf()
    }
  }, [pdfUrl, position])

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current || !containerRef.current || currentPage < 1 || currentPage > totalPages) return

      try {
        const page = await pdfDoc.getPage(currentPage)
        const canvas = canvasRef.current
        const container = containerRef.current
        const context = canvas.getContext('2d')
        
        if (!context) {
          console.error('Canvas context를 가져올 수 없습니다.')
          return
        }
        
        // 컨테이너에 맞게 자동 scale 계산
        const containerWidth = container.clientWidth - 32 // padding 고려
        const containerHeight = container.clientHeight - 32
        
        // PDF 문서의 실제 크기 가져오기 (scale 1.0으로)
        const actualViewport = page.getViewport({ scale: 1.0 })
        
        // 컨테이너에 맞게 scale 계산 (여백 고려)
        const scaleX = (containerWidth / actualViewport.width) * 0.95
        const scaleY = (containerHeight / actualViewport.height) * 0.95
        const autoScale = Math.min(scaleX, scaleY, 1.0) // 최대 100%까지만
        setCalculatedScale(autoScale)
        
        const viewport = page.getViewport({ scale: autoScale })
        canvas.height = viewport.height
        canvas.width = viewport.width
        setPageViewport({ viewport, page, actualViewport })

        // 캔버스 초기화
        context.clearRect(0, 0, canvas.width, canvas.height)

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }

        await page.render(renderContext).promise
      } catch (error: any) {
        console.error('페이지 렌더링 실패:', error)
      }
    }

    if (pdfDoc && totalPages > 0) {
      // 컨테이너 크기 변경 감지를 위한 약간의 지연
      const timer = setTimeout(() => {
        renderPage()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [pdfDoc, currentPage, totalPages])

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // 캔버스 클릭 시 PDF 좌표로 변환
  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPositionClick || !canvasRef.current || !pageViewport) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    // PDF 좌표로 변환
    // viewport는 이미 scale이 적용된 크기이고, canvas 크기와 동일함
    const { viewport, actualViewport } = pageViewport
    
    // 클릭 좌표를 PDF 좌표로 변환 (viewport는 scale이 적용된 크기)
    const pdfX = (clickX / viewport.width) * actualViewport.width
    // Y 좌표는 PDF 좌표계(하단이 0)로 변환하여 저장
    const pdfY = actualViewport.height - ((clickY / viewport.height) * actualViewport.height)

    onPositionClick({
      x: Math.round(pdfX),
      y: Math.round(pdfY),
      page: currentPage,
    })
  }

  return (
    <div ref={containerRef} className="space-y-4">
      {/* 컨트롤 */}
      <div className="flex items-center justify-between bg-gray-100 p-2 rounded">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1 bg-white border rounded disabled:opacity-50"
          >
            이전
          </button>
          <span className="text-sm">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 bg-white border rounded disabled:opacity-50"
          >
            다음
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">크기: {Math.round(calculatedScale * 100)}% (자동)</span>
        </div>
      </div>

      {/* PDF 캔버스와 서명 오버레이 */}
      <div 
        ref={containerRef}
        className="relative border border-gray-300 rounded overflow-hidden bg-gray-100 flex items-center justify-center" 
        style={{ height: '800px' }}
      >
        <div className="relative">
          <canvas 
            ref={canvasRef} 
            className="shadow-lg cursor-crosshair" 
            onClick={handleCanvasClick}
            title={onPositionClick ? "서명 위치를 클릭하세요" : ""}
          />
          {/* 서명 오버레이 - PDF 좌표에 정확히 맞춤 */}
          {signatureData && position && position.page === currentPage && canvasRef.current && pageViewport && pageViewport.actualViewport && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${(position.x / pageViewport.actualViewport.width) * canvasRef.current.width}px`,
                top: `${((pageViewport.actualViewport.height - position.y) / pageViewport.actualViewport.height) * canvasRef.current.height}px`, // Y 좌표 반전 (PDF 좌표계는 하단이 0)
                transform: 'translate(-50%, -50%)',
              }}
            >
              <img 
                src={signatureData} 
                alt="서명" 
                className="border-2 border-red-500 rounded shadow-lg bg-white p-1"
                style={{ 
                  width: `${Math.max(80, 100 * calculatedScale)}px`,
                  height: 'auto',
                  maxWidth: '200px',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface ReportDetailClientProps {
  report: any
  signedUrl: string | null
  canSign: boolean
}

export default function ReportDetailClient({ report, signedUrl, canSign }: ReportDetailClientProps) {
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false)
  const [signatureStatus, setSignatureStatus] = useState(report.signature_status || 'pending')
  const [signatureData, setSignatureData] = useState(report.signature_data || null)
  const [clickedPosition, setClickedPosition] = useState<{ x: number; y: number; page: number } | null>(null)

  const handlePositionClick = (position: { x: number; y: number; page: number }) => {
    setClickedPosition(position)
    setIsSignatureModalOpen(true)
  }

  const handleSaveSignature = async (
    signatureData: string, 
    signatureType: 'draw' | 'upload', 
    position: { x: number; y: number; page: number },
    signatureName?: string,
    textPosition?: { x: number; y: number; text: string }
  ) => {
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
          signatureName,
          textPosition,
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
              {report.title || report.inspection?.yyyy_mm || '점검 보고서'}
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
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`${report.inspection?.yyyy_mm || 'report'}_점검보고서.${report.file_type || 'pdf'}`}
                  className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  다운로드
                </a>
                {signatureStatus === 'signed' && (
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/reports/${report.id}/signed-file`)
                        if (!response.ok) {
                          const error = await response.json()
                          throw new Error(error.error || '다운로드에 실패했습니다.')
                        }
                        const blob = await response.blob()
                        const url = window.URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `${report.inspection?.yyyy_mm || 'report'}_점검보고서_서명본.${report.file_type || 'pdf'}`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        window.URL.revokeObjectURL(url)
                      } catch (error: any) {
                        alert(error.message || '검수파일 다운로드에 실패했습니다.')
                      }
                    }}
                    className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#F12711] hover:bg-[#D6220F]"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    검수파일 다운로드
                  </button>
                )}
              </div>
              {report.file_type === 'pdf' ? (
                <div className="mt-4">
                  {signedUrl ? (
                    <PdfViewerWithSignature
                      pdfUrl={signedUrl}
                      signatureData={signatureData}
                      position={report.signature_position}
                      onPositionClick={canSign && signatureStatus === 'pending' ? handlePositionClick : undefined}
                    />
                  ) : (
                    <div className="text-sm text-red-600">
                      PDF 파일을 불러올 수 없습니다.
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
        onClose={() => {
          setIsSignatureModalOpen(false)
          setClickedPosition(null)
        }}
        onSave={handleSaveSignature}
        reportId={report.id}
        defaultPosition={report.signature_position || { x: 0, y: 0, page: 1 }}
        clickedPosition={clickedPosition}
      />
    </>
  )
}

