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

    // 발주번호별로 그룹화할 맵 (tenant_id + order_number + contractStart + contractEnd -> contract)
    const contractMap = new Map<string, { contractId: string; tenantId: string; orderNumber: string; contractStart: string; contractEnd: string }>()

    // CSV 파일 내 중복 시리얼 검증 (사전 검증)
    const serialsInFile = new Map<string, number[]>() // serial -> row numbers
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      try {
        const values = parseCSVLine(line)
        const serial = values[headerMap['시리얼번호']]?.trim()
        if (serial) {
          if (!serialsInFile.has(serial)) {
            serialsInFile.set(serial, [])
          }
          serialsInFile.get(serial)!.push(i + 1)
        }
      } catch {
        // 파싱 에러는 나중에 처리
      }
    }

    // CSV 파일 내 중복 체크
    for (const [serial, rows] of serialsInFile.entries()) {
      if (rows.length > 1) {
        results.failed++
        results.errors.push(`CSV 파일 내 시리얼 번호 중복: "${serial}" (행: ${rows.join(', ')})`)
      }
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

        // 필수 필드 검증
        if (!customerName || !vendor || !model || !serial || !contractStart || !contractEnd) {
          results.failed++
          results.errors.push(`행 ${i + 1}: 필수 필드가 누락되었습니다. (고객사, 제조사, 모델, 시리얼번호, 계약기간 필수)`)
          continue
        }

        // 고객사 이름 검증 (공백, 특수문자 등)
        if (customerName.length < 1 || customerName.length > 100) {
          results.failed++
          results.errors.push(`행 ${i + 1}: 고객사 이름이 유효하지 않습니다. (1-100자)`)
          continue
        }

        // 시리얼 번호 검증
        if (serial.length < 1 || serial.length > 200) {
          results.failed++
          results.errors.push(`행 ${i + 1}: 시리얼 번호가 유효하지 않습니다. (1-200자)`)
          continue
        }

        // 날짜 형식 검증 (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(contractStart)) {
          results.failed++
          results.errors.push(`행 ${i + 1}: 계약기간(시작) 날짜 형식이 올바르지 않습니다. (YYYY-MM-DD 형식 필요)`)
          continue
        }
        if (!dateRegex.test(contractEnd)) {
          results.failed++
          results.errors.push(`행 ${i + 1}: 계약기간(종료) 날짜 형식이 올바르지 않습니다. (YYYY-MM-DD 형식 필요)`)
          continue
        }
        if (eol && !dateRegex.test(eol)) {
          results.failed++
          results.errors.push(`행 ${i + 1}: EOL 날짜 형식이 올바르지 않습니다. (YYYY-MM-DD 형식 필요)`)
          continue
        }

        // 날짜 유효성 검증
        const startDate = new Date(contractStart)
        const endDate = new Date(contractEnd)
        if (isNaN(startDate.getTime())) {
          results.failed++
          results.errors.push(`행 ${i + 1}: 계약기간(시작) 날짜가 유효하지 않습니다.`)
          continue
        }
        if (isNaN(endDate.getTime())) {
          results.failed++
          results.errors.push(`행 ${i + 1}: 계약기간(종료) 날짜가 유효하지 않습니다.`)
          continue
        }
        if (startDate > endDate) {
          results.failed++
          results.errors.push(`행 ${i + 1}: 계약기간(시작)이 계약기간(종료)보다 늦습니다.`)
          continue
        }
        if (eol) {
          const eolDate = new Date(eol)
          if (isNaN(eolDate.getTime())) {
            results.failed++
            results.errors.push(`행 ${i + 1}: EOL 날짜가 유효하지 않습니다.`)
            continue
          }
        }

        // 1. 고객사 확인 (정확한 매칭 - 대소문자 구분, 공백 제거 후 비교)
        // 먼저 정확한 이름으로 검색
        let { data: tenant } = await supabase
          .from('tenants')
          .select('id, name')
          .eq('name', customerName)
          .single()

        // 정확한 매칭이 없으면 유사한 이름 검색 (대소문자 무시)
        if (!tenant) {
          const { data: allTenants } = await supabase
            .from('tenants')
            .select('id, name')
          
          const normalizedCustomerName = customerName.toLowerCase().trim()
          const similarTenant = allTenants?.find(t => 
            t.name.toLowerCase().trim() === normalizedCustomerName
          )

          if (similarTenant) {
            results.failed++
            results.errors.push(`행 ${i + 1}: 고객사 이름이 일치하지 않습니다. 등록된 고객사: "${similarTenant.name}", 입력된 값: "${customerName}" (대소문자 또는 공백 차이)`)
            continue
          }

          // 유사한 이름도 없으면 새로 생성 (사용자 확인 필요)
          // 주의: 자동 생성은 위험할 수 있으므로 경고 메시지 추가
          const { data: newTenant, error: tenantError } = await supabase
            .from('tenants')
            .insert({ name: customerName })
            .select()
            .single()

          if (tenantError || !newTenant) {
            results.failed++
            results.errors.push(`행 ${i + 1}: 고객사 생성 실패 - ${tenantError?.message || '알 수 없는 오류'}`)
            continue
          }
          tenant = newTenant
          results.errors.push(`행 ${i + 1}: 새로운 고객사가 생성되었습니다: "${customerName}" (확인 필요)`)
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

        // 시리얼 번호 중복 검증 (같은 고객사 내에서)
        const { data: existingAsset } = await supabase
          .from('assets')
          .select('id, serial, tenant_id')
          .eq('serial', serial)
          .eq('tenant_id', tenant.id)
          .single()

        if (existingAsset) {
          results.failed++
          results.errors.push(`행 ${i + 1}: 시리얼 번호 중복 - "${serial}" (고객사: ${customerName})`)
          continue
        }

        // 전역 시리얼 중복 검증 (다른 고객사에 같은 시리얼이 있는지 확인)
        const { data: globalExistingAsset } = await supabase
          .from('assets')
          .select('id, serial, tenant:tenants(name)')
          .eq('serial', serial)
          .limit(1)

        if (globalExistingAsset && globalExistingAsset.length > 0) {
          const existingTenantName = (globalExistingAsset[0] as any).tenant?.name || '알 수 없음'
          // 경고만 표시하고 계속 진행 (같은 고객사가 아니면 허용)
          results.errors.push(`행 ${i + 1}: 경고 - 시리얼 번호 "${serial}"가 다른 고객사("${existingTenantName}")에 이미 존재합니다.`)
        }

        const { data: asset, error: assetError } = await supabase
          .from('assets')
          .insert(assetData)
          .select()
          .single()

        if (assetError || !asset) {
          results.failed++
          results.errors.push(`행 ${i + 1}: 자산 생성 실패 - ${assetError?.message || '알 수 없는 오류'}`)
          continue
        }

        // 4. 계약 처리 (발주번호별로 그룹화)
        let contractId: string | null = null
        
        if (orderNumber) {
          // 발주번호가 있으면 같은 발주번호의 계약 찾기 또는 생성
          const contractKey = `${tenant.id}_${orderNumber}_${contractStart}_${contractEnd}`
          
          if (contractMap.has(contractKey)) {
            // 이미 같은 발주번호의 계약이 있으면 재사용
            contractId = contractMap.get(contractKey)!.contractId
          } else {
            // 새 계약 생성 (발주번호 기반)
            const contractName = orderNumber ? `${customerName} - 발주번호: ${orderNumber}` : `${customerName} - ${vendor} ${model} (${serial})`
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
              results.errors.push(`행 ${i + 1}: 계약 생성 실패 - ${contractError?.message || '알 수 없는 오류'}`)
              continue
            }
            
            contractId = contract.id
            contractMap.set(contractKey, {
              contractId: contract.id,
              tenantId: tenant.id,
              orderNumber: orderNumber,
              contractStart: contractStart,
              contractEnd: contractEnd,
            })
          }
        } else {
          // 발주번호가 없으면 자산별로 개별 계약 생성
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
            results.errors.push(`행 ${i + 1}: 계약 생성 실패 - ${contractError?.message || '알 수 없는 오류'}`)
            continue
          }
          
          contractId = contract.id
        }

        // 5. 계약 항목 생성 (자산과 계약 연결)
        if (contractId) {
          const { error: contractItemError } = await supabase
            .from('contract_items')
            .insert({
              tenant_id: tenant.id,
              contract_id: contractId,
              asset_id: asset.id,
            })

          if (contractItemError) {
            results.failed++
            results.errors.push(`행 ${i + 1}: 계약 항목 생성 실패 - ${contractItemError.message}`)
            continue
          }
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

