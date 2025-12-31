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
  const [worksheetData, setWorksheetData] = useState<any>(null) // 엑셀 워크시트 데이터 저장
  const [selectedCell, setSelectedCell] = useState<{ col: number; row: number; address: string } | null>(null)
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
      
      // 워크시트 데이터 저장 (셀 좌표 변환에 사용)
      setWorksheetData(worksheet)
      
      // HTML로 변환 (더 정확한 스타일링을 위해)
      let html = XLSX.utils.sheet_to_html(worksheet, {
        id: 'excel-preview',
        editable: false,
      })
      
      // HTML에 셀 좌표 정보 추가 및 스타일 개선
      // 엑셀 테이블을 더 정확하게 렌더링하기 위해 스타일 추가
      html = html.replace(
        '<table',
        `<table style="border-collapse: collapse; font-family: '맑은 고딕', 'Malgun Gothic', Arial, sans-serif; font-size: 11pt;" cellpadding="0" cellspacing="0"`
      )
      
      // 각 셀에 data 속성 추가 (셀 주소 정보)
      const cellRegex = /<td[^>]*>/g
      let cellIndex = 0
      html = html.replace(cellRegex, (match) => {
        // 셀 주소 계산 (대략적인 방법)
        // 실제로는 XLSX의 셀 범위를 파싱해야 하지만, 간단하게 처리
        return match
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

  // 셀 주소를 숫자로 변환 (예: A1 -> {col: 0, row: 0}, F35 -> {col: 5, row: 34})
  const cellAddressToCoord = (address: string) => {
    const match = address.match(/^([A-Z]+)(\d+)$/)
    if (!match) return null
    
    const colStr = match[1]
    const rowStr = parseInt(match[2])
    
    // 컬럼 문자를 숫자로 변환 (A=0, B=1, ..., Z=25, AA=26, ...)
    let col = 0
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64)
    }
    col -= 1 // 0-based index
    
    return { col, row: rowStr - 1 } // row도 0-based
  }

  // 숫자 좌표를 셀 주소로 변환 (예: {col: 5, row: 34} -> F35)
  const coordToCellAddress = (col: number, row: number) => {
    let colStr = ''
    let tempCol = col + 1 // 1-based
    while (tempCol > 0) {
      const remainder = (tempCol - 1) % 26
      colStr = String.fromCharCode(65 + remainder) + colStr
      tempCol = Math.floor((tempCol - 1) / 26)
    }
    return `${colStr}${row + 1}` // row는 1-based
  }

  // 엑셀 포인트 좌표를 셀 좌표로 변환
  const pointToCellCoord = (x: number, y: number) => {
    // 엑셀 기본 셀 크기: 너비 약 64 픽셀 (48 포인트), 높이 약 20 포인트
    // 실제로는 워크시트의 셀 크기를 확인해야 하지만, 기본값 사용
    const defaultCellWidth = 48 // 포인트
    const defaultCellHeight = 20 // 포인트
    
    const col = Math.floor(x / defaultCellWidth)
    const row = Math.floor(y / defaultCellHeight)
    
    return { col, row }
  }

  // 셀 좌표를 엑셀 포인트 좌표로 변환
  const cellCoordToPoint = (col: number, row: number) => {
    const defaultCellWidth = 48 // 포인트
    const defaultCellHeight = 20 // 포인트
    
    // 셀의 중심 좌표 반환
    const x = col * defaultCellWidth + defaultCellWidth / 2
    const y = row * defaultCellHeight + defaultCellHeight / 2
    
    return { x, y }
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewRef.current) return

    const rect = previewRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    // 클릭한 요소가 셀인지 확인
    const target = e.target as HTMLElement
    const td = target.closest('td')
    
    if (td && worksheetData) {
      // 테이블에서 셀 위치 찾기
      const table = td.closest('table')
      if (table) {
        const rows = Array.from(table.querySelectorAll('tr'))
        const rowIndex = rows.findIndex(row => row.contains(td))
        const cells = Array.from(rows[rowIndex]?.querySelectorAll('td') || [])
        const colIndex = cells.findIndex(cell => cell === td)
        
        if (rowIndex >= 0 && colIndex >= 0) {
          // 셀 좌표를 엑셀 포인트 좌표로 변환
          const point = cellCoordToPoint(colIndex, rowIndex)
          const cellAddress = coordToCellAddress(colIndex, rowIndex)
          
          setSelectedCell({ col: colIndex, row: rowIndex, address: cellAddress })
          
          onPositionSelect({
            x: Math.round(point.x),
            y: Math.round(point.y),
            page: currentPage,
          })
          
          console.log('셀 클릭:', { 
            cellAddress, 
            col: colIndex, 
            row: rowIndex, 
            point: { x: point.x, y: point.y } 
          })
          return
        }
      }
    }

    // 셀이 아닌 곳을 클릭한 경우 기존 방식 사용
    const x = Math.round(clickX)
    const y = Math.round(clickY)
    
    // 포인트 좌표를 셀 좌표로 변환하여 표시
    const cellCoord = pointToCellCoord(x, y)
    const cellAddress = coordToCellAddress(cellCoord.col, cellCoord.row)
    setSelectedCell({ ...cellCoord, address: cellAddress })

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
              {selectedCell && (
                <span className="ml-2 font-bold text-blue-600">
                  선택된 셀: {selectedCell.address} (열: {selectedCell.col + 1}, 행: {selectedCell.row + 1})
                </span>
              )}
            </p>
          </div>
          <div
            ref={previewRef}
            className="relative border-2 border-gray-300 rounded-lg overflow-auto max-h-[600px] cursor-crosshair bg-white"
            onClick={handleClick}
            style={{ position: 'relative' }}
          >
            <style jsx>{`
              table {
                border-collapse: collapse;
                font-family: '맑은 고딕', 'Malgun Gothic', Arial, sans-serif;
                font-size: 11pt;
              }
              td {
                border: 1px solid #d1d5db;
                padding: 4px 8px;
                min-width: 64px;
                min-height: 20px;
                position: relative;
              }
              td:hover {
                background-color: #f3f4f6;
                cursor: crosshair;
              }
            `}</style>
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
                title={selectedCell ? `셀: ${selectedCell.address}` : ''}
              />
            )}
          </div>
        </div>
      )}

      <div className="bg-gray-50 p-3 rounded-lg">
        <p className="text-xs text-gray-600">
          현재 설정된 위치: X={!isNaN(currentPosition.x) && currentPosition.x !== undefined ? currentPosition.x : 0}, Y={!isNaN(currentPosition.y) && currentPosition.y !== undefined ? currentPosition.y : 0}, 페이지={currentPosition.page || 1}
          {selectedCell && (
            <span className="ml-2 font-semibold text-blue-600">
              | 셀: {selectedCell.address} (열: {selectedCell.col + 1}, 행: {selectedCell.row + 1})
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

