'use client'

import { useState, useRef, useEffect } from 'react'

interface SignatureModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (signatureData: string, signatureType: 'draw' | 'upload', position: { x: number; y: number; page: number }) => void
  reportId: string
  defaultPosition?: { x: number; y: number; page: number }
}

export default function SignatureModal({ isOpen, onClose, onSave, reportId, defaultPosition }: SignatureModalProps) {
  const [signatureType, setSignatureType] = useState<'draw' | 'upload'>('draw')
  const [signatureData, setSignatureData] = useState<string>('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [position, setPosition] = useState(defaultPosition || { x: 0, y: 0, page: 1 })

  useEffect(() => {
    if (isOpen && signatureType === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }
  }, [isOpen, signatureType])

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    } else if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }
    return { x: 0, y: 0 }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const { x, y } = getCoordinates(e, canvas)
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return

    const { x, y } = getCoordinates(e, canvas)
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    const canvas = canvasRef.current
    if (canvas) {
      setSignatureData(canvas.toDataURL('image/png'))
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      setSignatureData('')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setSignatureData(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    if (signatureType === 'draw' && !signatureData) {
      alert('서명을 입력해주세요.')
      return
    }
    if (signatureType === 'upload' && !signatureData) {
      alert('서명 파일을 업로드해주세요.')
      return
    }

    await onSave(signatureData, signatureType, position)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-[#1A1A4D] mb-4">서명 추가</h2>

        {/* 서명 타입 선택 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">서명 방식</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="draw"
                checked={signatureType === 'draw'}
                onChange={(e) => {
                  setSignatureType('draw')
                  setSignatureData('')
                  setUploadedFile(null)
                }}
                className="mr-2"
              />
              직접 그리기
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="upload"
                checked={signatureType === 'upload'}
                onChange={(e) => {
                  setSignatureType('upload')
                  setSignatureData('')
                  clearCanvas()
                }}
                className="mr-2"
              />
              파일 업로드
            </label>
          </div>
        </div>

        {/* 위치 설정 */}
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">X 좌표</label>
            <input
              type="number"
              value={position.x}
              onChange={(e) => setPosition({ ...position, x: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Y 좌표</label>
            <input
              type="number"
              value={position.y}
              onChange={(e) => setPosition({ ...position, y: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">페이지</label>
            <input
              type="number"
              min="1"
              value={position.page}
              onChange={(e) => setPosition({ ...position, page: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* 직접 그리기 */}
        {signatureType === 'draw' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">서명 그리기</label>
            <div className="border-2 border-gray-300 rounded-lg p-4 bg-white">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="border border-gray-200 rounded cursor-crosshair"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <button
                type="button"
                onClick={clearCanvas}
                className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                지우기
              </button>
            </div>
          </div>
        )}

        {/* 파일 업로드 */}
        {signatureType === 'upload' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">서명 파일 업로드</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {signatureData && (
              <div className="mt-4">
                <img src={signatureData} alt="서명 미리보기" className="max-w-full h-auto border border-gray-300 rounded" />
              </div>
            )}
          </div>
        )}

        {/* 버튼 */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-[#1A1A4D] text-white rounded-md hover:bg-[#0F0C29]"
          >
            서명 저장
          </button>
        </div>
      </div>
    </div>
  )
}

