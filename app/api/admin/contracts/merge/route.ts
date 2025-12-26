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

    const supabase = createAdminClient()
    const results = {
      success: true,
      merged: 0,
      errors: [] as string[],
    }

    // 1. 발주번호가 있는 자산들과 그들의 계약 정보 조회
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select(`
        id,
        tenant_id,
        order_number
      `)
      .not('order_number', 'is', null)
      .neq('order_number', '')

    if (assetsError) {
      return NextResponse.json(
        { error: assetsError.message || '자산 조회에 실패했습니다.' },
        { status: 500 }
      )
    }

    // 2. 각 자산의 계약 정보 조회
    const contractMap = new Map<string, {
      tenantId: string
      orderNumber: string
      startDate: string
      endDate: string
      contractIds: Set<string>
    }>()

    for (const asset of assets || []) {
      if (!asset.order_number) continue

      // 이 자산에 연결된 계약들 조회
      const { data: contractItems } = await supabase
        .from('contract_items')
        .select(`
          contract_id,
          contract:contracts!inner(
            id,
            tenant_id,
            start_date,
            end_date
          )
        `)
        .eq('asset_id', asset.id)

      if (!contractItems || contractItems.length === 0) continue

      for (const item of contractItems) {
        const contract = (item as any).contract
        if (!contract || contract.tenant_id !== asset.tenant_id) continue

        const key = `${contract.tenant_id}_${asset.order_number}_${contract.start_date}_${contract.end_date}`
        
        if (!contractMap.has(key)) {
          contractMap.set(key, {
            tenantId: contract.tenant_id,
            orderNumber: asset.order_number,
            startDate: contract.start_date,
            endDate: contract.end_date,
            contractIds: new Set(),
          })
        }
        
        contractMap.get(key)!.contractIds.add(contract.id)
      }
    }

    // 2. 각 그룹에서 여러 계약이 있으면 통합
    for (const [key, group] of contractMap.entries()) {
      if (group.contractIds.size <= 1) continue // 하나면 통합 불필요

      const contractIds = Array.from(group.contractIds)
      
      // 가장 오래된 계약을 기준으로 사용
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, created_at')
        .in('id', contractIds)
        .order('created_at', { ascending: true })

      if (!contracts || contracts.length === 0) continue

      const mergedContractId = contracts[0].id
      const otherContractIds = contractIds.filter(id => id !== mergedContractId)

      // 고객사 이름 가져오기
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', group.tenantId)
        .single()

      const tenantName = tenant?.name || '알 수 없음'
      const newContractName = `${tenantName} - 발주번호: ${group.orderNumber}`

      // 통합 계약명 업데이트
      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          name: newContractName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', mergedContractId)

      if (updateError) {
        results.errors.push(`계약 ${mergedContractId} 업데이트 실패: ${updateError.message}`)
        continue
      }

      // 다른 계약들의 contract_items를 통합 계약으로 이동
      for (const oldContractId of otherContractIds) {
        // 먼저 중복 체크를 위해 통합 계약에 이미 있는 asset_id 조회
        const { data: existingItems } = await supabase
          .from('contract_items')
          .select('asset_id')
          .eq('contract_id', mergedContractId)

        const existingAssetIds = new Set((existingItems || []).map((item: any) => item.asset_id))

        // 이동할 contract_items 조회
        const { data: itemsToMove } = await supabase
          .from('contract_items')
          .select('id, asset_id')
          .eq('contract_id', oldContractId)

        for (const item of itemsToMove || []) {
          if (existingAssetIds.has(item.asset_id)) {
            // 중복이면 기존 항목 유지, 이동할 항목 삭제
            await supabase
              .from('contract_items')
              .delete()
              .eq('id', item.id)
          } else {
            // 중복이 아니면 통합 계약으로 이동
            const { error: moveError } = await supabase
              .from('contract_items')
              .update({
                contract_id: mergedContractId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.id)

            if (moveError) {
              results.errors.push(`계약 항목 ${item.id} 이동 실패: ${moveError.message}`)
            }
          }
        }

        // 이동이 완료된 계약 삭제 (contract_items가 없는 경우만)
        const { data: remainingItems } = await supabase
          .from('contract_items')
          .select('id')
          .eq('contract_id', oldContractId)
          .limit(1)

        if (!remainingItems || remainingItems.length === 0) {
          const { error: deleteError } = await supabase
            .from('contracts')
            .delete()
            .eq('id', oldContractId)

          if (deleteError) {
            results.errors.push(`계약 ${oldContractId} 삭제 실패: ${deleteError.message}`)
          }
        }
      }

      results.merged++
    }

    return NextResponse.json(results)
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        merged: 0,
        errors: [error.message || '계약 통합 처리에 실패했습니다.'],
      },
      { status: 500 }
    )
  }
}

