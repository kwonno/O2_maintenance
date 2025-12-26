import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const isAdmin = await isOperatorAdmin(user.id)

    if (!isAdmin) {
      return NextResponse.json(
        { error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: '파일이 없습니다.' },
        { status: 400 }
      )
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV 파일이 비어있거나 헤더만 있습니다.' },
        { status: 400 }
      )
    }

    // 헤더 확인 및 파싱
    const header = lines[0].split(',').map(h => h.trim())
    const expectedHeaders = [
      '고객사', '제조사', '모델', '시리얼번호',
      '계약기간(시작)', '계약기간(종료)', 'EOL', '발주번호', '비고'
    ]

    // BOM 제거 및 헤더 매핑
    const headerMap: { [key: string]: number } = {}
    expectedHeaders.forEach((expected, index) => {
      const foundIndex = header.findIndex(h => 
        h.replace(/^\uFEFF/, '').trim() === expected || 
        h.replace(/^\uFEFF/, '').trim() === expectedHeaders[index]
      )
      if (foundIndex !== -1) {
        headerMap[expected] = foundIndex
      }
    })

    const supabase = createAdminClient()
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    // 데이터 행 처리
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      try {
        const values = parseCSVLine(line)
        
        const customerName = values[headerMap['고객사']]?.trim()
        const vendor = values[headerMap['제조사']]?.trim()
        const model = values[headerMap['모델']]?.trim()
        const serial = values[headerMap['시리얼번호']]?.trim()
        const contractStart = values[headerMap['계약기간(시작)']]?.trim()
        const contractEnd = values[headerMap['계약기간(종료)']]?.trim()
        const eol = values[headerMap['EOL']]?.trim()
        const orderNumber = values[headerMap['발주번호']]?.trim()
        const remarks = values[headerMap['비고']]?.trim()

        if (!customerName || !vendor || !model || !serial || !contractStart || !contractEnd) {
          results.failed++
          results.errors.push(`행 ${i + 1}: 필수 필드가 누락되었습니다.`)
          continue
        }

        // 1. 고객사 확인 또는 생성
        let { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('name', customerName)
          .single()

        if (!tenant) {
          const { data: newTenant, error: tenantError } = await supabase
            .from('tenants')
            .insert({ name: customerName })
            .select()
            .single()

          if (tenantError || !newTenant) {
            results.failed++
            results.errors.push(`행 ${i + 1}: 고객사 생성 실패 - ${tenantError?.message}`)
            continue
          }
          tenant = newTenant
        }

        if (!tenant || !tenant.id) {
          results.failed++
          results.errors.push(`행 ${i + 1}: 고객사 정보를 찾을 수 없습니다.`)
          continue
        }

        // 2. 제조사/모델 확인 (vendor_id, model_id 사용)
        let vendorId: string | null = null
        let modelId: string | null = null

        // vendors 테이블에서 제조사 확인
        const { data: existingVendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('name', vendor)
          .single()

        if (existingVendor) {
          vendorId = existingVendor.id
        } else {
          // 제조사가 없으면 텍스트로 저장
        }

        // models 테이블에서 모델 확인
        if (vendorId) {
          const { data: existingModel } = await supabase
            .from('models')
            .select('id')
            .eq('vendor_id', vendorId)
            .eq('name', model)
            .single()

          if (existingModel) {
            modelId = existingModel.id
          }
        }

        // 3. 자산 생성
        const assetData: any = {
          tenant_id: tenant.id,
          vendor: vendor,
          model: model,
          serial: serial,
          status: 'active',
          order_number: orderNumber || null,
          remarks: remarks || null,
        }

        if (vendorId) assetData.vendor_id = vendorId
        if (modelId) assetData.model_id = modelId
        if (eol) assetData.eol_date = eol

        const { data: asset, error: assetError } = await supabase
          .from('assets')
          .insert(assetData)
          .select()
          .single()

        if (assetError || !asset) {
          results.failed++
          results.errors.push(`행 ${i + 1}: 자산 생성 실패 - ${assetError?.message}`)
          continue
        }

        // 4. 계약 생성
        const contractName = `${customerName} - ${vendor} ${model} (${serial})`
        const { data: contract, error: contractError } = await supabase
          .from('contracts')
          .insert({
            tenant_id: tenant.id,
            name: contractName,
            start_date: contractStart,
            end_date: contractEnd,
          })
          .select()
          .single()

        if (contractError || !contract) {
          results.failed++
          results.errors.push(`행 ${i + 1}: 계약 생성 실패 - ${contractError?.message}`)
          continue
        }

        // 5. 계약 항목 생성 (자산과 계약 연결)
        const { error: contractItemError } = await supabase
          .from('contract_items')
          .insert({
            tenant_id: tenant.id,
            contract_id: contract.id,
            asset_id: asset.id,
          })

        if (contractItemError) {
          results.failed++
          results.errors.push(`행 ${i + 1}: 계약 항목 생성 실패 - ${contractItemError.message}`)
          continue
        }

        results.success++
      } catch (error: any) {
        results.failed++
        results.errors.push(`행 ${i + 1}: ${error.message || '처리 중 오류 발생'}`)
      }
    }

    return NextResponse.json(results)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '업로드 처리에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// CSV 라인 파싱 (쉼표와 따옴표 처리)
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }
  values.push(current)

  return values
}

