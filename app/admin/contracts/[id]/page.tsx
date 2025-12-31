import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ContractEditForm from '@/components/admin/contract-edit-form'

export const dynamic = 'force-dynamic'

export default async function AdminContractEditPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const user = await requireAuth()
  const isAdmin = await isOperatorAdmin(user.id)

  if (!isAdmin) {
    return <div>권한이 없습니다.</div>
  }

  const resolvedParams = await Promise.resolve(params)
  const contractId = resolvedParams.id

  const supabase = createAdminClient()
  const { data: contract, error } = await supabase
    .from('contracts')
    .select(`
      *,
      tenant:tenants(name)
    `)
    .eq('id', contractId)
    .single()

  if (error || !contract) {
    notFound()
  }

  // 계약에 연결된 자산 목록 조회
  const { data: contractItems } = await supabase
    .from('contract_items')
    .select(`
      *,
      asset:assets(*)
    `)
    .eq('contract_id', contractId)

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <Link href="/admin/contracts" className="text-[#1A1A4D] hover:text-[#F12711] text-sm">
          ← 계약 목록으로
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-[#1A1A4D] mb-1">계약 수정</h1>
          <p className="text-sm text-gray-600">계약 정보를 수정합니다</p>
        </div>
        <ContractEditForm contract={contract} />
      </div>

      {contractItems && contractItems.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#1A1A4D] mb-4">연결된 자산 ({contractItems.length}개)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#F3F3FB]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                    제조사
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                    모델
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                    시리얼번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                    발주번호
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contractItems.map((item: any) => (
                  <tr key={item.id} className="hover:bg-[#F3F3FB]">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.asset?.vendor || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.asset?.model || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.asset?.serial || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.asset?.order_number || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}



