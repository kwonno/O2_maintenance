import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getTenantUserByUserId } from '@/lib/auth/tenant-helper'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSignedUrl } from '@/lib/supabase/storage'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import * as XLSX from 'xlsx'
import { readFile } from 'fs/promises'
import path from 'path'

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
        // UI에서 표시할 때: transform: translate(-50%, -50%)로 중심 기준
        // pdf-lib에서도 이미지의 중심이 position에 오도록 X, Y 모두 보정
        const x = (report.signature_position.x || 0) - (width / 2)
        const y = (report.signature_position.y || 0) - (height / 2)
        
        console.log('서명 위치 계산:', {
          저장된좌표: { x: report.signature_position.x, y: report.signature_position.y },
          이미지크기: { width, height },
          계산된좌표: { x, y },
          페이지높이: pageHeight
        })
        
        page.drawImage(signatureImage, {
          x: x,
          y: y,
          width: width,
          height: height,
        })

        // 텍스트 위치에 이름 추가 (pdf-lib + fontkit으로 한글 폰트 임베딩)
        const drawTextWithFont = async (text: string, xPos: number, yPos: number, fontSize: number) => {
          try {
            // pdf-lib에 fontkit 등록
            pdfDoc.registerFontkit(fontkit)
            
            // 한글 폰트 로드 시도 (Vercel 서버리스 환경 고려)
            let krFont = null
            
            // Vercel에서는 .next/standalone 또는 .next/server에 파일이 복사됨
            const possiblePaths = [
              // 1. lib/fonts (로컬 개발 및 Vercel)
              path.join(process.cwd(), 'lib', 'fonts', 'NotoSansKR-Regular.ttf'),
              // 2. .next/standalone/lib/fonts (Vercel standalone 빌드)
              path.join(process.cwd(), '.next', 'standalone', 'lib', 'fonts', 'NotoSansKR-Regular.ttf'),
              // 3. .next/server/lib/fonts (Vercel server 빌드)
              path.join(process.cwd(), '.next', 'server', 'lib', 'fonts', 'NotoSansKR-Regular.ttf'),
              // 4. public/fonts (클라이언트용이지만 시도)
              path.join(process.cwd(), 'public', 'fonts', 'NotoSansKR-Regular.ttf'),
              // 5. 시스템 폰트 (fallback)
              ...(process.platform === 'win32' ? [
                'C:/Windows/Fonts/malgun.ttf',
                'C:/Windows/Fonts/gulim.ttc',
              ] : process.platform === 'darwin' ? [
                '/System/Library/Fonts/Supplemental/AppleGothic.ttf',
              ] : [
                '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
              ])
            ]
            
            console.log('폰트 로드 시도 - process.cwd():', process.cwd())
            console.log('폰트 로드 시도 - 플랫폼:', process.platform)
            console.log('폰트 로드 시도 - NODE_ENV:', process.env.NODE_ENV)
            
            for (const fontPath of possiblePaths) {
              try {
                console.log('폰트 경로 시도:', fontPath)
                const fontBytes = await readFile(fontPath)
                krFont = await pdfDoc.embedFont(fontBytes, { subset: true })
                console.log('✅ 한글 폰트 로드 성공:', fontPath)
                break
              } catch (e: any) {
                console.warn('❌ 폰트 로드 실패:', fontPath, e.message)
                // 다음 폰트 시도
                continue
              }
            }
            
            if (!krFont) {
              console.warn('한글 폰트를 찾을 수 없습니다. 기본 폰트 사용 (한글이 깨질 수 있음)')
              // 기본 폰트로 시도 (한글이 깨질 수 있음)
              const helveticaFont = await pdfDoc.embedStandardFont(StandardFonts.Helvetica)
              const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize)
              const x = xPos - (textWidth / 2)
              const y = yPos - (fontSize / 2)
              
              page.drawText(text, {
                x,
                y,
                size: fontSize,
                font: helveticaFont,
              })
              return
            }
            
            // 텍스트 폭 계산 (센터 기준으로 X 보정)
            const textWidth = krFont.widthOfTextAtSize(text, fontSize)
            const x = xPos - (textWidth / 2)
            const y = yPos - (fontSize / 2)
            
            console.log('텍스트 위치 계산 (pdf-lib + fontkit):', {
              저장된좌표: { x: xPos, y: yPos },
              텍스트폭: textWidth,
              계산된좌표: { x, y },
              폰트크기: fontSize
            })
            
            page.drawText(text, {
              x,
              y,
              size: fontSize,
              font: krFont,
            })
          } catch (error) {
            console.error('텍스트 그리기 실패:', error)
            // 폴백: 기본 폰트로 시도 (한글이 깨질 수 있음)
            try {
              const helveticaFont = await pdfDoc.embedStandardFont(StandardFonts.Helvetica)
              const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize)
              const x = xPos - (textWidth / 2)
              const y = yPos - (fontSize / 2)
              
              page.drawText(text, {
                x,
                y,
                size: fontSize,
                font: helveticaFont,
              })
            } catch (e) {
              console.error('폴백 텍스트 그리기 실패:', e)
            }
          }
        }

        // 텍스트 위치에 이름 추가 (우선순위: text_position > signature_name)
        if (report.text_position && report.text_position.text) {
          await drawTextWithFont(
            report.text_position.text,
            report.text_position.x || 0,
            report.text_position.y || 0,
            18 // 폰트 크기
          )
        } else if (report.signature_name) {
          // 서명자 이름이 있고 텍스트 위치가 없으면 이름 위치가 있으면 그 위치에, 없으면 서명 위치 옆에 표시
          if (report.name_position_x && report.name_position_y) {
            // 이름 위치가 설정되어 있으면 그 위치에 표시
            await drawTextWithFont(
              report.signature_name,
              report.name_position_x || 0,
              report.name_position_y || 0,
              18 // 폰트 크기
            )
          } else {
            // 이름 위치가 없으면 서명 위치 옆에 표시
            await drawTextWithFont(
              report.signature_name,
              (report.signature_position.x || 0) + width + 10,
              (report.signature_position.y || 0),
              18 // 폰트 크기
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


