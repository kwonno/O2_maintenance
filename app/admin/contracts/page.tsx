import { requireAuth, isOperatorAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'

export default async function AdminContractsPage() {
  const user = await requireAuth()
  const isAdmin = await isOperatorAdmin(user.id)

  if (!isAdmin) {
    return <div>권한이 없습니다.</div>
  }

  const supabase = createAdminClient()
  const { data: contracts } = await supabase
    .from('contracts')
    .select(`
      *,
      tenant:tenants(name)
    `)
    .order('end_date', { ascending: true })

  const today = new Date()

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A4D] mb-1">계약 관리</h1>
          <p className="text-sm text-gray-600">모든 고객사의 계약을 관리합니다</p>
        </div>
        <Link
          href="/admin/contracts/merge"
          className="px-4 py-2 bg-[#F12711] text-white rounded-lg hover:bg-[#F53C05] transition-colors text-sm"
        >
          발주번호별 통합
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#F3F3FB]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                  계약명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                  고객사
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                  계약 기간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[#1A1A4D] uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {contracts && contracts.map((contract: any) => {
                const endDate = new Date(contract.end_date)
                const daysLeft = differenceInDays(endDate, today)
                const isExpired = endDate < today
                const isExpiringSoon = daysLeft >= 0 && daysLeft <= 30

                return (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[#1A1A4D]">
                        {contract.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {contract.tenant?.name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(contract.start_date), 'yyyy-MM-dd', { locale: ko })} ~
                        {format(endDate, 'yyyy-MM-dd', { locale: ko })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isExpired ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          만료됨
                        </span>
                      ) : isExpiringSoon ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          D-{daysLeft}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          유효
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <Link
                          href={`/admin/contracts/${contract.id}`}
                          className="text-[#1A1A4D] hover:text-[#F12711]"
                        >
                          수정
                        </Link>
                        <span className="text-gray-300">|</span>
                        <Link
                          href={`/app/contracts/${contract.id}`}
                          className="text-[#1A1A4D] hover:text-[#F12711]"
                        >
                          상세보기
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(!contracts || contracts.length === 0) && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <p className="text-gray-500">계약이 없습니다.</p>
        </div>
      )}
    </div>
  )
}

