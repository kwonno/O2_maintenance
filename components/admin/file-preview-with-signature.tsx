'use client'

import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'

interface FilePreviewWithSignatureProps {
  file: File | null
  onPositionSelect: (position: { x: number; y: number; page: number }) => void
  currentPosition: { x: number; y: number; page: number }
}

export default function FilePreviewWithSignature({
  file,
  onPositionSelect,
  currentPosition,
}: FilePreviewWithSignatureProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [excelHtml, setExcelHtml] = useState<string | null>(null)
  const [fileType, setFileType] = useState<'pdf' | 'xlsx' | 'xls' | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const previewRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      setExcelHtml(null)
      setFileType(null)
      return
    }

    const fileName = file.name.toLowerCase()
    if (fileName.endsWith('.pdf')) {
      setFileType('pdf')
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      setExcelHtml(null)
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      setFileType(fileName.endsWith('.xlsx') ? 'xlsx' : 'xls')
      loadExcelFile(file)
      setPreviewUrl(null)
    }

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [file])

  const loadExcelFile = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      
      // 첫 번째 시트 가져오기
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      
      // HTML로 변환
      const html = XLSX.utils.sheet_to_html(worksheet, {
        id: 'excel-preview',
        editable: false,
      })
      
      setExcelHtml(html)
    } catch (error) {
      console.error('Excel 파일 로드 실패:', error)
      setExcelHtml('<p class="text-red-600">엑셀 파일을 불러올 수 없습니다.</p>')
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewRef.current) return

    const rect = previewRef.current.getBoundingClientRect()
    const x = Math.round(e.clientX - rect.left)
    const y = Math.round(e.clientY - rect.top)

    onPositionSelect({
      x,
      y,
      page: currentPage,
    })
  }

  const handlePdfPageChange = (page: number) => {
    if (page < 1) return
    setCurrentPage(page)
    onPositionSelect({
      ...currentPosition,
      page,
    })
  }

  if (!file) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <p className="text-gray-500">파일을 업로드하면 미리보기가 표시됩니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-3 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>서명 위치 설정:</strong> 미리보기에서 서명할 위치를 클릭하세요. 클릭한 위치의 좌표가 자동으로 설정됩니다.
        </p>
      </div>

      {fileType === 'pdf' && previewUrl && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">페이지 선택:</label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handlePdfPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
              >
                이전
              </button>
              <span className="text-sm text-gray-700">
                페이지 {currentPage}
              </span>
              <button
                type="button"
                onClick={() => handlePdfPageChange(currentPage + 1)}
                className="px-3 py-1 text-sm border border-gray-300 rounded"
              >
                다음
              </button>
            </div>
          </div>
          <div
            ref={previewRef}
            className="relative border-2 border-gray-300 rounded-lg overflow-hidden cursor-crosshair"
            onClick={handleClick}
          >
            <iframe
              ref={iframeRef}
              src={`${previewUrl}#page=${currentPage}`}
              className="w-full h-[600px]"
              title="PDF 미리보기"
              onLoad={() => {
                // PDF 페이지 수를 가져오는 것은 복잡하므로 기본값 사용
                // 실제로는 PDF.js를 사용해야 하지만, 여기서는 간단하게 처리
              }}
            />
            {currentPosition.x > 0 && currentPosition.y > 0 && currentPosition.page === currentPage && (
              <div
                className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg pointer-events-none"
                style={{
                  left: `${currentPosition.x}px`,
                  top: `${currentPosition.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            )}
          </div>
        </div>
      )}

      {(fileType === 'xlsx' || fileType === 'xls') && excelHtml && (
        <div className="space-y-2">
          <div className="bg-yellow-50 p-2 rounded">
            <p className="text-sm text-yellow-800">
              <strong>참고:</strong> 엑셀 파일의 첫 번째 시트가 표시됩니다. 서명 위치는 첫 번째 시트 기준으로 설정됩니다.
            </p>
          </div>
          <div
            ref={previewRef}
            className="relative border-2 border-gray-300 rounded-lg overflow-auto max-h-[600px] cursor-crosshair bg-white"
            onClick={handleClick}
            style={{ position: 'relative' }}
          >
            <div
              dangerouslySetInnerHTML={{ __html: excelHtml }}
              className="p-4"
            />
            {currentPosition.x > 0 && currentPosition.y > 0 && (
              <div
                className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg pointer-events-none z-10"
                style={{
                  left: `${currentPosition.x}px`,
                  top: `${currentPosition.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            )}
          </div>
        </div>
      )}

      <div className="bg-gray-50 p-3 rounded-lg">
        <p className="text-xs text-gray-600">
          현재 설정된 위치: X={currentPosition.x}, Y={currentPosition.y}, 페이지={currentPosition.page}
        </p>
      </div>
    </div>
  )
}

