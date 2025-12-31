import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getTenantUserByUserId } from '@/lib/auth/tenant-helper'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSignedUrl } from '@/lib/supabase/storage'
import { PDFDocument } from 'pdf-lib'
import * as XLSX from 'xlsx'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await requireAuth()
    const tenantUser = await getTenantUserByUserId(user.id)

    if (!tenantUser) {
      return NextResponse.json(
        { error: '고객사 정보를 찾을 수 없습니다.' },
        { status: 403 }
      )
    }

    const resolvedParams = await Promise.resolve(params)
    const supabase = createAdminClient()

    // 보고서 확인
    const { data: report, error: reportError } = await supabase
      .from('inspection_reports')
      .select('*')
      .eq('id', resolvedParams.id)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: '보고서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 서명이 완료되지 않은 경우
    if (report.signature_status !== 'signed' || !report.signature_data) {
      return NextResponse.json(
        { error: '서명이 완료되지 않은 보고서입니다.' },
        { status: 400 }
      )
    }

    // 원본 파일 다운로드
    if (!report.file_path) {
      return NextResponse.json(
        { error: '원본 파일을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const originalFileUrl = await getSignedUrl(report.file_path, 3600)
    const fileResponse = await fetch(originalFileUrl)
    const fileBuffer = await fileResponse.arrayBuffer()

    let signedFileBuffer: Uint8Array | ArrayBuffer
    const fileName = report.file_path.split('/').pop() || 'report'
    const fileExtension = report.file_type || 'pdf'

    if (fileExtension === 'pdf') {
      // PDF에 서명 추가
      const pdfDoc = await PDFDocument.load(fileBuffer)
      const pages = pdfDoc.getPages()
      
      if (report.signature_position && report.signature_position.page > 0 && report.signature_position.page <= pages.length) {
        const page = pages[report.signature_position.page - 1]
        const pageHeight = page.getHeight()
        
        // 서명 이미지 추가
        // signature_data는 base64 문자열이거나 data URL일 수 있음
        let signatureImageData = report.signature_data
        if (signatureImageData.includes(',')) {
          signatureImageData = signatureImageData.split(',')[1]
        }
        const signatureImage = await pdfDoc.embedPng(Buffer.from(signatureImageData, 'base64'))
        const { width, height } = signatureImage.scale(0.3) // 서명 크기 조정
        
        // PDF 좌표계: pdf-lib의 drawImage는 y를 하단 기준으로 사용
        // 저장된 좌표는 클릭한 위치 (PDF 문서 좌표, 하단이 0)
        // UI에서 표시할 때: top = ((pageHeight - y) / pageHeight) * canvasHeight, transform: translate(-50%, -50%)
        // 즉, 이미지의 중심이 position.y에 오게 표시됨
        // pdf-lib에서 이미지의 중심이 position.y에 오도록 하려면:
        // - 이미지의 하단이 position.y - height/2에 위치해야 함
        // - 하지만 pdf-lib는 y를 하단 기준으로 사용하므로: y = position.y - height/2
        const x = report.signature_position.x || 0
        // 이미지의 중심이 position.y에 오도록: y = position.y - height/2
        const y = (report.signature_position.y || 0) - (height / 2)
        
        console.log('서명 위치 계산:', {
          저장된좌표: { x: report.signature_position.x, y: report.signature_position.y },
          이미지크기: { width, height },
          계산된y: y,
          페이지높이: pageHeight,
          이미지중심예상위치: (report.signature_position.y || 0)
        })
        
        page.drawImage(signatureImage, {
          x: x,
          y: y,
          width: width,
          height: height,
        })

        // 텍스트 위치에 이름 추가 (한글 지원을 위해 이미지로 변환)
        const drawTextAsImage = async (text: string, xPos: number, yPos: number, fontSize: number) => {
          try {
            // Node.js 환경에서 canvas를 사용하여 텍스트를 이미지로 변환
            const { createCanvas, registerFont } = await import('canvas')
            const fs = await import('fs')
            const os = await import('os')
            
            let fontLoaded = false
            // 한글 폰트 로드 시도 (시스템 폰트 사용)
            try {
              const platform = os.platform()
              let fontPaths: string[] = []
              
              if (platform === 'win32') {
                // Windows 기본 한글 폰트 경로
                fontPaths = [
                  'C:/Windows/Fonts/malgun.ttf', // 맑은 고딕
                  'C:/Windows/Fonts/gulim.ttc', // 굴림
                  'C:/Windows/Fonts/batang.ttc', // 바탕
                ]
              } else if (platform === 'darwin') {
                // macOS 한글 폰트 경로
                fontPaths = [
                  '/System/Library/Fonts/Supplemental/AppleGothic.ttf',
                  '/Library/Fonts/AppleGothic.ttf',
                ]
              } else {
                // Linux 한글 폰트 경로
                fontPaths = [
                  '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
                  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
                ]
              }
              
              for (const fontPath of fontPaths) {
                try {
                  if (fs.existsSync(fontPath)) {
                    registerFont(fontPath, { family: 'KoreanFont' })
                    fontLoaded = true
                    console.log('한글 폰트 로드 성공:', fontPath)
                    break
                  }
                } catch (e) {
                  console.warn('폰트 로드 실패:', fontPath, e)
                }
              }
            } catch (e) {
              console.warn('한글 폰트 로드 실패, 기본 폰트 사용:', e)
            }
            
            // 텍스트 크기 측정을 위해 더 큰 캔버스 사용
            const canvas = createCanvas(600, 150)
            const ctx = canvas.getContext('2d')
            
            // 캔버스 배경을 투명하게 설정
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            
            ctx.fillStyle = 'black'
            // 한글 폰트가 있으면 사용, 없으면 기본 폰트
            if (fontLoaded) {
              ctx.font = `bold ${fontSize}px KoreanFont`
            } else {
              // 기본 폰트 사용 (한글이 깨질 수 있음)
              ctx.font = `bold ${fontSize}px Arial, sans-serif`
            }
            
            // 텍스트 크기 측정
            ctx.textBaseline = 'middle'
            ctx.textAlign = 'center'
            
            // 텍스트를 캔버스 중앙에 그리기 (나중에 중심 기준으로 위치 조정)
            const centerX = canvas.width / 2
            const centerY = canvas.height / 2
            
            // 텍스트가 제대로 렌더링되는지 확인
            try {
              ctx.fillText(text, centerX, centerY)
              console.log('텍스트 렌더링 성공:', text, '폰트:', fontLoaded ? 'KoreanFont' : 'Arial')
            } catch (e) {
              console.error('텍스트 렌더링 실패:', e)
              // UTF-8 인코딩으로 다시 시도
              const textBuffer = Buffer.from(text, 'utf-8')
              ctx.fillText(textBuffer.toString('utf-8'), centerX, centerY)
            }
            
            // 텍스트 영역만 잘라내기 (실제 텍스트 크기에 맞게)
            const imageBytes = canvas.toBuffer('image/png')
            const textImage = await pdfDoc.embedPng(imageBytes)
            const textDims = textImage.scale(1.0) // 크기 조정 (필요시 조정)
            
            // pdf-lib의 drawImage는 y를 하단 기준으로 사용
            // UI에서도 텍스트의 중심이 yPos에 오도록 표시됨 (transform: translate(-50%, -50%))
            // pdf-lib에서 텍스트 이미지의 중심이 yPos에 오도록: y = yPos - textDims.height/2
            const textY = yPos - (textDims.height / 2)
            
            console.log('텍스트 위치 계산:', {
              저장된좌표: { x: xPos, y: yPos },
              텍스트이미지크기: { width: textDims.width, height: textDims.height },
              계산된y: textY,
              텍스트중심예상위치: yPos
            })
            
            page.drawImage(textImage, {
              x: xPos,
              y: textY,
              width: textDims.width,
              height: textDims.height,
            })
          } catch (error) {
            console.error('텍스트 이미지 생성 실패:', error)
            // 폴백: 텍스트를 그대로 시도 (한글이 아닌 경우)
            try {
              const textY = pageHeight - yPos - fontSize
              page.drawText(text, {
                x: xPos,
                y: textY,
                size: fontSize,
              })
            } catch (e) {
              console.error('텍스트 그리기 실패:', e)
            }
          }
        }

        // 텍스트 위치에 이름 추가 (우선순위: text_position > signature_name)
        if (report.text_position && report.text_position.text) {
          await drawTextAsImage(
            report.text_position.text,
            report.text_position.x || 0,
            report.text_position.y || 0,
            18 // 폰트 크기 증가
          )
        } else if (report.signature_name) {
          // 서명자 이름이 있고 텍스트 위치가 없으면 이름 위치가 있으면 그 위치에, 없으면 서명 위치 옆에 표시
          if (report.name_position_x && report.name_position_y) {
            // 이름 위치가 설정되어 있으면 그 위치에 표시
            await drawTextAsImage(
              report.signature_name,
              report.name_position_x || 0,
              report.name_position_y || 0,
              18 // 폰트 크기 증가
            )
          } else {
            // 이름 위치가 없으면 서명 위치 옆에 표시
            // pdf-lib의 drawImage는 y를 하단 기준으로 사용하므로, 서명의 중심 높이에 맞춤
            await drawTextAsImage(
              report.signature_name,
              x + width + 10,
              y - height / 2, // 서명의 중심 높이
              18 // 폰트 크기 증가
            )
          }
        }
      }
      
      // pdfDoc.save()는 Uint8Array를 반환
      signedFileBuffer = await pdfDoc.save()
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // 엑셀 파일의 경우 원본 파일을 그대로 반환 (엑셀에 이미지 삽입은 복잡하므로)
      // 또는 서명 정보를 메타데이터로 추가할 수 있지만, 여기서는 원본 파일 반환
      signedFileBuffer = fileBuffer
    } else {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다.' },
        { status: 400 }
      )
    }

    // 파일명 생성
    const signedFileName = `${fileName.replace(/\.[^/.]+$/, '')}_서명본.${fileExtension}`

    // 서명된 파일 반환 (Uint8Array를 Buffer로 변환)
    const responseBuffer = signedFileBuffer instanceof Uint8Array 
      ? Buffer.from(signedFileBuffer) 
      : Buffer.from(signedFileBuffer)
    
    return new NextResponse(responseBuffer, {
      headers: {
        'Content-Type': fileExtension === 'pdf' 
          ? 'application/pdf' 
          : fileExtension === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/vnd.ms-excel',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(signedFileName)}"`,
      },
    })
  } catch (error: any) {
    console.error('서명된 파일 생성 실패:', error)
    return NextResponse.json(
      { error: error.message || '서명된 파일을 생성할 수 없습니다.' },
      { status: 500 }
    )
  }
}


