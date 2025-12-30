'use client'

import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import PdfPreviewCanvas from './pdf-preview-canvas'

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
  const [clickMode, setClickMode] = useState(false) // 클릭 모드 활성화 여부
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
      // 직접 arrayBuffer로 읽기 (MIME type 문제 회피)
      const arrayBuffer = await file.arrayBuffer()
      
      // XLSX 라이브러리로 읽기
      const workbook = XLSX.read(arrayBuffer, { 
        type: 'array',
        cellDates: false,
        cellNF: false,
        cellText: false,
        dense: false,
      })
      
      // 첫 번째 시트 가져오기
      if (workbook.SheetNames.length === 0) {
        throw new Error('시트가 없습니다.')
      }
      
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      
      // HTML로 변환
      const html = XLSX.utils.sheet_to_html(worksheet, {
        id: 'excel-preview',
        editable: false,
      })
      
      setExcelHtml(html)
    } catch (error: any) {
      console.error('Excel 파일 로드 실패:', error)
      // 바이너리 문자열 방식으로 재시도
      try {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => {
            if (typeof e.target?.result === 'string') {
              resolve(e.target.result)
            } else if (e.target?.result instanceof ArrayBuffer) {
              const bytes = new Uint8Array(e.target.result)
              let binary = ''
              for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i])
              }
              resolve(binary)
            } else {
              reject(new Error('파일 읽기 실패'))
            }
          }
          reader.onerror = reject
          reader.readAsBinaryString(file)
        })
        
        const workbook = XLSX.read(data, { 
          type: 'binary',
          cellDates: false,
          cellNF: false,
          cellText: false,
        })
        
        if (workbook.SheetNames.length === 0) {
          throw new Error('시트가 없습니다.')
        }
        
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const html = XLSX.utils.sheet_to_html(worksheet, {
          id: 'excel-preview',
          editable: false,
        })
        setExcelHtml(html)
      } catch (retryError: any) {
        setExcelHtml(`<div class="p-4"><p class="text-red-600">엑셀 파일을 불러올 수 없습니다: ${retryError.message || error.message || '알 수 없는 오류'}</p><p class="text-xs text-gray-500 mt-2">파일 형식을 확인해주세요.</p></div>`)
      }
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

      {fileType === 'pdf' && file && (
        <div className="space-y-2">
          <div className="bg-yellow-50 p-2 rounded text-sm text-yellow-800">
            PDF에서 서명할 위치를 클릭하세요. (자동 축소: 한 화면에 맞춤)
          </div>
          <PdfPreviewCanvas
            file={file}
            onPositionSelect={onPositionSelect}
            currentPosition={currentPosition}
            // scale을 지정하지 않으면 자동으로 컨테이너에 맞게 축소
          />
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
          현재 설정된 위치: X={!isNaN(currentPosition.x) && currentPosition.x !== undefined ? currentPosition.x : 0}, Y={!isNaN(currentPosition.y) && currentPosition.y !== undefined ? currentPosition.y : 0}, 페이지={currentPosition.page || 1}
        </p>
      </div>
    </div>
  )
}

