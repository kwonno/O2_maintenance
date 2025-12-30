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
        // 저장된 좌표는 클릭한 위치 (이미지의 중심 또는 상단을 의도)
        // pdf-lib에서 이미지의 상단이 지정된 y에 오려면 y + height를 사용해야 함
        const x = report.signature_position.x || 0
        // 클릭한 위치에 이미지의 상단이 오도록 조정 (pdf-lib는 y를 하단 기준으로 사용)
        const y = (report.signature_position.y || 0) + height
        
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
            const path = await import('path')
            const fs = await import('fs')
            
            // 한글 폰트 로드 시도 (시스템 폰트 사용)
            try {
              // Windows 기본 한글 폰트 경로
              const fontPaths = [
                'C:/Windows/Fonts/malgun.ttf', // 맑은 고딕
                'C:/Windows/Fonts/gulim.ttc', // 굴림
                'C:/Windows/Fonts/batang.ttc', // 바탕
              ]
              
              for (const fontPath of fontPaths) {
                if (fs.existsSync(fontPath)) {
                  registerFont(fontPath, { family: 'KoreanFont' })
                  break
                }
              }
            } catch (e) {
              console.warn('한글 폰트 로드 실패, 기본 폰트 사용:', e)
            }
            
            // 텍스트 크기 측정을 위해 더 큰 캔버스 사용
            const canvas = createCanvas(400, 100)
            const ctx = canvas.getContext('2d')
            
            ctx.fillStyle = 'black'
            // 한글 폰트가 있으면 사용, 없으면 기본 폰트
            try {
              ctx.font = `${fontSize}px KoreanFont, Arial, sans-serif`
            } catch (e) {
              ctx.font = `${fontSize}px Arial, sans-serif`
            }
            
            // 텍스트 그리기 (baseline 조정)
            ctx.textBaseline = 'top'
            ctx.fillText(text, 10, 10)
            
            const imageBytes = canvas.toBuffer('image/png')
            const textImage = await pdfDoc.embedPng(imageBytes)
            const textDims = textImage.scale(0.5)
            
            // pdf-lib의 drawImage는 y를 하단 기준으로 사용
            // 클릭한 위치에 텍스트 이미지의 상단이 오도록 조정
            const textY = yPos + textDims.height
            
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
            12
          )
        } else if (report.signature_name) {
          // 서명자 이름이 있고 텍스트 위치가 없으면 이름 위치가 있으면 그 위치에, 없으면 서명 위치 옆에 표시
          if (report.name_position_x && report.name_position_y) {
            // 이름 위치가 설정되어 있으면 그 위치에 표시
            await drawTextAsImage(
              report.signature_name,
              report.name_position_x || 0,
              report.name_position_y || 0,
              12
            )
          } else {
            // 이름 위치가 없으면 서명 위치 옆에 표시
            // pdf-lib의 drawImage는 y를 하단 기준으로 사용하므로, 서명의 중심 높이에 맞춤
            await drawTextAsImage(
              report.signature_name,
              x + width + 5,
              y - height / 2, // 서명의 중심 높이
              12
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


