import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getTenantUserByUserId } from '@/lib/auth/tenant-helper'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSignedUrl } from '@/lib/supabase/storage'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import { readFile } from 'fs/promises'
import path from 'path'

// Vercel에서 edge로 잡히는 경우 방지
export const runtime = 'nodejs'

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
            // pdf-lib에 fontkit 등록 (1번만)
            pdfDoc.registerFontkit(fontkit)
            
            // 한글 폰트 로드: 파일 시스템에서만 읽기 (URL fetch 제거, 안정성 우선)
            let krFont = null
            
            const possiblePaths = [
              path.join(process.cwd(), 'public', 'fonts', 'NotoSansKR-Regular.ttf'),
              '/var/task/public/fonts/NotoSansKR-Regular.ttf', // Vercel Lambda 경로
              path.join(process.cwd(), 'lib', 'fonts', 'NotoSansKR-Regular.ttf'),
              path.join(process.cwd(), '.next', 'standalone', 'lib', 'fonts', 'NotoSansKR-Regular.ttf'),
              path.join(process.cwd(), '.next', 'server', 'lib', 'fonts', 'NotoSansKR-Regular.ttf'),
            ]
            
            console.log('폰트 파일 시스템 로드 시도 - process.cwd():', process.cwd())
            
            for (const fontPath of possiblePaths) {
              try {
                console.log('폰트 경로 시도:', fontPath)
                const fontBytes = await readFile(fontPath)
                // 핵심: subset: false로 전체 폰트 임베딩 (뷰어 호환성 확보)
                krFont = await pdfDoc.embedFont(fontBytes) // subset 제거
                console.log('✅ 한글 폰트 로드 성공 (파일, 전체 임베딩):', fontPath, '크기:', fontBytes.length, 'bytes')
                break
              } catch (e: any) {
                console.warn('❌ 폰트 로드 실패:', fontPath, e.message)
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
                color: rgb(0, 0, 0), // 검은색 명시
                opacity: 1, // 완전 불투명
              })
              return
            }
            
            // 폰트가 제대로 로드되었는지 확인
            if (!krFont) {
              throw new Error('한글 폰트가 로드되지 않았습니다')
            }
            
            // 텍스트 폭 계산 (센터 기준으로 X 보정)
            let textWidth: number
            try {
              textWidth = krFont.widthOfTextAtSize(text, fontSize)
              console.log('텍스트 폭 계산 성공:', textWidth, '텍스트:', text)
            } catch (widthError: any) {
              console.error('텍스트 폭 계산 실패:', widthError.message)
              throw widthError
            }
            
            const x = xPos - (textWidth / 2)
            const y = yPos - (fontSize / 2)
            
            console.log('텍스트 위치 계산 (pdf-lib + fontkit):', {
              저장된좌표: { x: xPos, y: yPos },
              텍스트: text,
              텍스트폭: textWidth,
              계산된좌표: { x, y },
              폰트크기: fontSize,
              폰트사용: true
            })
            
            try {
              // 텍스트 색상과 opacity를 명시적으로 설정 (뷰어 호환성 확보)
              page.drawText(text, {
                x,
                y,
                size: fontSize,
                font: krFont,
                color: rgb(0, 0, 0), // 검은색 명시
                opacity: 1, // 완전 불투명
              })
              console.log('✅ 텍스트 그리기 성공:', text, '색상: 검은색, opacity: 1')
            } catch (drawError: any) {
              console.error('❌ 텍스트 그리기 실패:', drawError.message, drawError.stack)
              throw drawError
            }
          } catch (error: any) {
            console.error('텍스트 그리기 실패:', {
              error: error.message,
              stack: error.stack,
              text: text,
              fontSize: fontSize
            })
            // 폴백: 기본 폰트로 시도 (한글이 깨질 수 있음)
            try {
              console.warn('기본 폰트로 폴백 시도 (한글이 깨질 수 있음)')
              const helveticaFont = await pdfDoc.embedStandardFont(StandardFonts.Helvetica)
              const textWidth = helveticaFont.widthOfTextAtSize(text, fontSize)
              const x = xPos - (textWidth / 2)
              const y = yPos - (fontSize / 2)
              
              page.drawText(text, {
                x,
                y,
                size: fontSize,
                font: helveticaFont,
                color: rgb(0, 0, 0), // 검은색 명시
                opacity: 1, // 완전 불투명
              })
              console.warn('기본 폰트로 텍스트 그리기 완료 (한글이 깨질 수 있음)')
            } catch (e: any) {
              console.error('폴백 텍스트 그리기 실패:', e.message, e.stack)
              // 최종 폴백: 폰트 없이 시도
              try {
                page.drawText(text, {
                  x: xPos,
                  y: yPos,
                  size: fontSize,
                  color: rgb(0, 0, 0), // 검은색 명시
                  opacity: 1, // 완전 불투명
                })
              } catch (finalError: any) {
                console.error('최종 폴백 실패:', finalError.message)
              }
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
      // 엑셀 파일에 서명과 이름 추가
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(fileBuffer)
      
      // 첫 번째 시트 가져오기
      const worksheet = workbook.worksheets[0]
      if (!worksheet) {
        return NextResponse.json(
          { error: '엑셀 파일에 시트가 없습니다.' },
          { status: 400 }
        )
      }
      
      // 서명 이미지 추가
      if (report.signature_data && report.signature_position) {
        try {
          // base64 이미지 데이터 추출
          let signatureImageData = report.signature_data
          if (signatureImageData.includes(',')) {
            signatureImageData = signatureImageData.split(',')[1]
          }
          const signatureBuffer = Buffer.from(signatureImageData, 'base64')
          
          // 저장된 좌표 (포인트 단위)
          const x = report.signature_position.x || 0
          const y = report.signature_position.y || 0
          
          // 이미지 추가 (엑셀은 포인트 단위 사용)
          const imageId = workbook.addImage({
            buffer: signatureBuffer as any,
            extension: 'png',
          })
          
          // 이미지 크기 조정 (서명 크기에 맞게)
          const imageWidth = 100 // 포인트 단위 (약 3.5cm)
          const imageHeight = 40 // 포인트 단위 (약 1.4cm)
          
          // 포인트 좌표를 셀 좌표로 변환 (실제 셀 크기 사용)
          // exceljs에서 셀 크기는 기본값: 너비 64픽셀(약 48포인트), 높이 20포인트
          // 하지만 실제 셀 크기를 확인해야 함
          let col = 0
          let row = 0
          let accumulatedWidth = 0
          let accumulatedHeight = 0
          
          // 열 너비 누적하여 x 좌표에 해당하는 열 찾기
          for (let c = 1; c <= worksheet.columnCount; c++) {
            const column = worksheet.getColumn(c)
            const colWidth = column.width || 8.43 // 기본 너비 (문자 단위, 약 64픽셀 = 48포인트)
            const colWidthPoints = colWidth * 7 // 대략 1 문자 = 7 포인트
            if (accumulatedWidth + colWidthPoints > x) {
              col = c - 1 // 0-based index
              break
            }
            accumulatedWidth += colWidthPoints
          }
          
          // 행 높이 누적하여 y 좌표에 해당하는 행 찾기
          for (let r = 1; r <= worksheet.rowCount; r++) {
            const rowObj = worksheet.getRow(r)
            const rowHeight = rowObj.height || 15 // 기본 높이 (포인트)
            if (accumulatedHeight + rowHeight > y) {
              row = r - 1 // 0-based index
              break
            }
            accumulatedHeight += rowHeight
          }
          
          // 이미지 위치를 셀 내부 오프셋으로 조정 (포인트 단위)
          const colWidthPoints = (worksheet.getColumn(col + 1).width || 8.43) * 7
          const rowHeightPoints = worksheet.getRow(row + 1).height || 15
          const colOffset = (x - accumulatedWidth) / colWidthPoints // 0~1 사이의 비율
          const rowOffset = (y - accumulatedHeight) / rowHeightPoints // 0~1 사이의 비율
          
          // exceljs는 colOffset, rowOffset을 직접 지원하지 않으므로
          // 오프셋이 크면 다음 셀로 이동
          let finalCol = col
          let finalRow = row
          if (colOffset > 0.5 && col < worksheet.columnCount - 1) {
            finalCol = col + 1
          }
          if (rowOffset > 0.5 && row < worksheet.rowCount - 1) {
            finalRow = row + 1
          }
          
          worksheet.addImage(imageId, {
            tl: { col: finalCol, row: finalRow },
            ext: { width: imageWidth, height: imageHeight },
          })
          
          console.log('엑셀 서명 이미지 추가:', { 
            x, y, 
            col: col + 1, 
            row: row + 1, 
            colOffset, 
            rowOffset,
            width: imageWidth, 
            height: imageHeight 
          })
        } catch (imageError: any) {
          console.error('엑셀 서명 이미지 추가 실패:', imageError.message, imageError.stack)
          // 이미지 추가 실패해도 계속 진행
        }
      }
      
      // 이름 텍스트 추가
      if (report.signature_name) {
        try {
          let nameX = 0
          let nameY = 0
          
          // 이름 위치 우선순위: text_position > name_position > signature_position 옆
          if (report.text_position && report.text_position.x !== undefined && report.text_position.y !== undefined) {
            nameX = report.text_position.x
            nameY = report.text_position.y
          } else if (report.name_position_x !== undefined && report.name_position_y !== undefined) {
            nameX = report.name_position_x
            nameY = report.name_position_y
          } else if (report.signature_position) {
            nameX = (report.signature_position.x || 0) + 120 // 서명 옆에 배치
            nameY = report.signature_position.y || 0
          }
          
          // 포인트 좌표를 셀 좌표로 변환 (실제 셀 크기 사용)
          let col = 0
          let row = 0
          let accumulatedWidth = 0
          let accumulatedHeight = 0
          
          // 열 너비 누적하여 x 좌표에 해당하는 열 찾기
          for (let c = 1; c <= worksheet.columnCount; c++) {
            const column = worksheet.getColumn(c)
            const colWidth = column.width || 8.43
            const colWidthPoints = colWidth * 7
            if (accumulatedWidth + colWidthPoints > nameX) {
              col = c - 1
              break
            }
            accumulatedWidth += colWidthPoints
          }
          
          // 행 높이 누적하여 y 좌표에 해당하는 행 찾기
          for (let r = 1; r <= worksheet.rowCount; r++) {
            const rowObj = worksheet.getRow(r)
            const rowHeight = rowObj.height || 15
            if (accumulatedHeight + rowHeight > nameY) {
              row = r - 1
              break
            }
            accumulatedHeight += rowHeight
          }
          
          // 셀에 텍스트 추가 (기존 서식 보존)
          const cell = worksheet.getCell(row + 1, col + 1) // 엑셀은 1부터 시작
          
          // 기존 셀 값이 있으면 유지하고, 없으면 이름 추가
          // 기존 서식 보존
          const existingValue = cell.value
          const existingFont = cell.font
          const existingAlignment = cell.alignment
          
          // 셀 값 설정 (기존 값이 있으면 유지, 없으면 이름 추가)
          if (!existingValue || existingValue === null || existingValue === '') {
            cell.value = report.signature_name
          } else {
            // 기존 값이 있으면 그대로 유지 (기존 서명 이미지 등 보존)
            console.log('셀에 기존 값이 있어 텍스트 추가하지 않음:', { col: col + 1, row: row + 1, existingValue })
          }
          
          // 폰트는 기존 것이 있으면 유지, 없으면 설정
          if (!existingFont || !existingFont.name) {
            cell.font = {
              ...existingFont,
              name: existingFont?.name || '맑은 고딕',
              size: existingFont?.size || 12,
              bold: existingFont?.bold !== undefined ? existingFont.bold : true,
            }
          }
          
          // 정렬은 기존 것이 있으면 유지, 없으면 가운데 정렬
          if (!existingAlignment || !existingAlignment.horizontal) {
            cell.alignment = {
              ...existingAlignment,
              vertical: existingAlignment?.vertical || 'middle',
              horizontal: existingAlignment?.horizontal || 'center', // 가운데 정렬
            }
          }
          
          console.log('엑셀 이름 텍스트 추가:', { 
            nameX, 
            nameY, 
            col: col + 1, 
            row: row + 1, 
            text: report.signature_name,
            existingValue: existingValue ? '있음' : '없음'
          })
        } catch (textError: any) {
          console.error('엑셀 이름 텍스트 추가 실패:', textError.message, textError.stack)
          // 텍스트 추가 실패해도 계속 진행
        }
      }
      
      // 수정된 엑셀 파일을 버퍼로 변환
      const excelBuffer = await workbook.xlsx.writeBuffer()
      signedFileBuffer = Buffer.from(excelBuffer)
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


