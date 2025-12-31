'use client'

import { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import PdfPreviewCanvas from './pdf-preview-canvas'

interface FilePreviewWithSignatureProps {
  file: File | null
  onPositionSelect: (position: { x: number; y: number; page: number; cell?: string }) => void
  currentPosition: { x: number; y: number; page: number; cell?: string }
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
      
      // HTML로 직접 렌더링 (병합셀 반영 + data-r/data-c 심기)
      const html = renderWorksheetToHtml(worksheet)
      
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
        setWorksheetData(worksheet)
        const html = renderWorksheetToHtml(worksheet)
        setExcelHtml(html)
      } catch (retryError: any) {
        setExcelHtml(`<div class="p-4"><p class="text-red-600">엑셀 파일을 불러올 수 없습니다: ${retryError.message || error.message || '알 수 없는 오류'}</p><p class="text-xs text-gray-500 mt-2">파일 형식을 확인해주세요.</p></div>`)
      }
    }
  }

  // HTML 이스케이프
  const escapeHtml = (s: string) => {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  // 셀 주소를 숫자로 변환 (예: A1 -> {col: 0, row: 0}, F35 -> {col: 5, row: 34})
  const cellAddressToCoord = (address: string) => {
    const match = address.match(/^([A-Z]+)(\d+)$/)
    if (!match) return { col: 0, row: 0 }
    
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

  // ws['!ref'] -> range 디코드
  const decodeRef = (ref?: string) => {
    if (!ref) return { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }
    const parts = ref.split(':')
    const sAddr = parts[0]
    const eAddr = parts[1] || parts[0]
    const s = cellAddressToCoord(sAddr)
    const e = cellAddressToCoord(eAddr)
    return { s: { r: s.row, c: s.col }, e: { r: e.row, c: e.col } } // 0-based
  }

  // 엑셀 워크시트를 HTML로 직접 렌더링(+ 병합셀 반영 + data-r/data-c 심기)
  const renderWorksheetToHtml = (ws: any) => {
    const ref = decodeRef(ws['!ref'])
    const merges = (ws['!merges'] ?? []) as Array<{ s: { r: number; c: number }, e: { r: number; c: number } }>

    // merge 시작셀 -> {rowspan,colspan}
    const mergeStart = new Map<string, { rs: number; cs: number }>()
    // merge에 덮이는 셀(시작셀 제외) skip
    const covered = new Set<string>()

    for (const m of merges) {
      const rs = m.e.r - m.s.r + 1
      const cs = m.e.c - m.s.c + 1
      mergeStart.set(`${m.s.r},${m.s.c}`, { rs, cs })
      for (let r = m.s.r; r <= m.e.r; r++) {
        for (let c = m.s.c; c <= m.e.c; c++) {
          if (r === m.s.r && c === m.s.c) continue
          covered.add(`${r},${c}`)
        }
      }
    }

    const rowCount = ref.e.r - ref.s.r + 1
    const colCount = ref.e.c - ref.s.c + 1
    // 너무 큰 시트 방어
    if (rowCount * colCount > 20000) {
      return `<div style="padding:12px;color:#666;">시트가 너무 커서( ${rowCount}x${colCount} ) 미리보기를 단순화해야 합니다.</div>`
    }

    let html = `<table class="excel-preview-table" style="border-collapse: collapse; font-family: '맑은 고딕', 'Malgun Gothic', Arial, sans-serif; font-size: 11pt;" cellpadding="0" cellspacing="0"><tbody>`
    for (let r = ref.s.r; r <= ref.e.r; r++) {
      html += `<tr>`
      for (let c = ref.s.c; c <= ref.e.c; c++) {
        const key = `${r},${c}`
        if (covered.has(key)) continue

        const m = mergeStart.get(key)
        const rs = m?.rs ?? 1
        const cs = m?.cs ?? 1

        const addr = coordToCellAddress(c, r) // 0-based -> A1
        const cell = ws[addr]
        const value = cell?.w ?? (cell?.v != null ? String(cell.v) : '')

        html += `<td data-r="${r}" data-c="${c}" data-addr="${addr}"`
        if (rs > 1) html += ` rowspan="${rs}"`
        if (cs > 1) html += ` colspan="${cs}"`
        html += `>${escapeHtml(value)}</td>`
      }
      html += `</tr>`
    }
    html += `</tbody></table>`
    return html
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

    // 엑셀 파일인 경우 병합셀 처리
    if ((fileType === 'xlsx' || fileType === 'xls') && worksheetData) {
      const td = (e.target as HTMLElement).closest('td') as HTMLTableCellElement | null
      if (!td) return

      const startR = Number(td.dataset.r ?? '0')
      const startC = Number(td.dataset.c ?? '0')
      const cs = td.colSpan || 1
      const rs = td.rowSpan || 1

      const rect = td.getBoundingClientRect()
      const xIn = e.clientX - rect.left
      const yIn = e.clientY - rect.top

      // colspan/rowspan 내부를 "가상 셀"로 분할해서 클릭한 칸 계산
      const cOffset = Math.min(cs - 1, Math.floor((xIn / rect.width) * cs))
      const rOffset = Math.min(rs - 1, Math.floor((yIn / rect.height) * rs))

      const realC = startC + cOffset
      const realR = startR + rOffset

      const cellAddress = coordToCellAddress(realC, realR)
      setSelectedCell({ col: realC, row: realR, address: cellAddress })

      // 포인트 좌표는 참고용
      const point = cellCoordToPoint(realC, realR)
      onPositionSelect({
        x: Math.round(point.x),
        y: Math.round(point.y),
        page: currentPage,
        cell: cellAddress, // 셀 주소 추가
      })

      console.log('엑셀 셀 클릭 (병합셀 처리):', {
        cellAddress,
        col: realC + 1,
        row: realR + 1,
        startCell: coordToCellAddress(startC, startR),
        colspan: cs,
        rowspan: rs,
        cOffset,
        rOffset,
        point: { x: point.x, y: point.y }
      })
      return
    }

    // PDF 파일인 경우 기존 방식 사용
    const rect = previewRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const clickY = e.clientY - rect.top

    const x = Math.round(clickX)
    const y = Math.round(clickY)

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

