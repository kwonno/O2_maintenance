'use client'

import { useState, useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

// PDF.js worker 설정
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
}

interface PdfPreviewCanvasProps {
  file: File
  onPositionSelect: (position: { x: number; y: number; page: number }) => void
  currentPosition: { x: number; y: number; page: number }
  scale?: number // 자동 계산 (지정하지 않으면 컨테이너에 맞게 자동 축소)
}

export default function PdfPreviewCanvas({
  file,
  onPositionSelect,
  currentPosition,
  scale,
}: PdfPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [pageViewport, setPageViewport] = useState<any>(null)
  const [calculatedScale, setCalculatedScale] = useState<number>(1.0)

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          withCredentials: false,
        })
        const pdf = await loadingTask.promise
        setPdfDoc(pdf)
        setTotalPages(pdf.numPages)
        setCurrentPage(1)
      } catch (error: any) {
        console.error('PDF 로드 실패:', error)
      }
    }

    loadPdf()
  }, [file])

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
        
        // scale이 지정되지 않으면 컨테이너에 맞게 자동 계산
        let finalScale = scale
        if (!finalScale) {
          const containerWidth = container.clientWidth - 32 // padding 고려
          const containerHeight = container.clientHeight - 32
          const pageView = page.view
          
          // 컨테이너에 맞게 scale 계산 (여백 고려)
          const scaleX = (containerWidth / pageView.width) * 0.95
          const scaleY = (containerHeight / pageView.height) * 0.95
          finalScale = Math.min(scaleX, scaleY, 1.0) // 최대 100%까지만
          setCalculatedScale(finalScale)
        } else {
          setCalculatedScale(finalScale)
        }
        
        const viewport = page.getViewport({ scale: finalScale })
        canvas.height = viewport.height
        canvas.width = viewport.width
        setPageViewport({ viewport, page })

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
  }, [pdfDoc, currentPage, scale, totalPages])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !pageViewport || !containerRef.current) return

    const canvas = canvasRef.current
    const container = containerRef.current
    
    // 캔버스의 실제 위치 (스크롤 고려)
    const canvasRect = canvas.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    
    // 클릭 위치를 캔버스 좌표로 변환 (스크롤 오프셋 포함)
    const clickX = e.clientX - canvasRect.left
    const clickY = e.clientY - canvasRect.top

    // PDF 좌표로 변환
    const { viewport, page } = pageViewport
    const pageSize = page.view
    
    // 클릭 좌표를 PDF 좌표로 변환
    const pdfX = (clickX / viewport.width) * pageSize.width
    // Y 좌표는 PDF 좌표계(하단이 0)로 변환하여 저장
    const pdfY = pageSize.height - ((clickY / viewport.height) * pageSize.height)

    const roundedX = Math.round(pdfX)
    const roundedY = Math.round(pdfY)

    console.log('클릭 좌표:', { 
      clientX: e.clientX, 
      clientY: e.clientY,
      canvasLeft: canvasRect.left,
      canvasTop: canvasRect.top,
      clickX, 
      clickY, 
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      pageSizeWidth: pageSize.width,
      pageSizeHeight: pageSize.height,
      pdfX, 
      pdfY, 
      roundedX, 
      roundedY 
    })

    onPositionSelect({
      x: roundedX,
      y: roundedY,
      page: currentPage,
    })
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
          >
            이전
          </button>
          <span className="text-sm text-gray-700">
            페이지 {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
          >
            다음
          </button>
        </div>
        <span className="text-xs text-gray-500">크기: {Math.round(calculatedScale * 100)}% {scale ? '(고정)' : '(자동)'}</span>
      </div>
      <div 
        ref={containerRef}
        className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center" 
        style={{ height: '600px' }}
      >
        <div className="relative">
          <canvas 
            ref={canvasRef} 
            className="shadow-lg cursor-crosshair" 
            onClick={handleCanvasClick}
            title="서명 위치를 클릭하세요"
          />
          {/* 현재 위치 마커 */}
          {!isNaN(currentPosition.x) && !isNaN(currentPosition.y) && currentPosition.x > 0 && currentPosition.y > 0 && currentPosition.page === currentPage && canvasRef.current && pageViewport && (
            <div
              className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg pointer-events-none z-20"
              style={{
                left: `${(currentPosition.x / pageViewport.page.view.width) * canvasRef.current.width}px`,
                top: `${((pageViewport.page.view.height - currentPosition.y) / pageViewport.page.view.height) * canvasRef.current.height}px`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

