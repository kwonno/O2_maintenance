import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'

export default async function ContractsPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .single()

  if (!tenantUser) {
    return <div>테넌트 정보를 찾을 수 없습니다.</div>
  }

  const tenantId = tenantUser.tenant_id
  const isOperatorAdmin = tenantUser.role === 'operator_admin'

  let query = supabase
    .from('contracts')
    .select('*')
    .order('end_date', { ascending: true })

  if (!isOperatorAdmin) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data: contracts } = await query

  const today = new Date()

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">계약</h1>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {contracts && contracts.map((contract) => {
            const endDate = new Date(contract.end_date)
            const daysLeft = differenceInDays(endDate, today)
            const isExpired = endDate < today
            const isExpiringSoon = daysLeft >= 0 && daysLeft <= 30

            return (
              <li key={contract.id}>
                <Link href={`/app/contracts/${contract.id}`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{contract.name}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(contract.start_date), 'yyyy년 MM월 dd일', { locale: ko })} ~
                          {format(endDate, 'yyyy년 MM월 dd일', { locale: ko })}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
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
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {(!contracts || contracts.length === 0) && (
        <div className="text-center py-12">
          <p className="text-gray-500">계약이 없습니다.</p>
        </div>
      )}
    </div>
  )
}

