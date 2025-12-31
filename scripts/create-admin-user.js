// 초기 운영자 사용자 생성 스크립트
// 사용법: node scripts/create-admin-user.js

const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 설정하세요.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createAdminUser() {
  return new Promise((resolve) => {
    rl.question('이메일: ', async (email) => {
      rl.question('비밀번호: ', async (password) => {
        rl.question('이름: ', async (name) => {
          rl.question('테넌트 ID (UUID): ', async (tenantId) => {
            try {
              // 비밀번호 해시 생성
              const passwordHash = await bcrypt.hash(password, 10)

              // 사용자 생성
              const { data: user, error: userError } = await supabase
                .from('users')
                .insert({
                  email: email.toLowerCase(),
                  password_hash: passwordHash,
                  name: name || null,
                })
                .select()
                .single()

              if (userError) {
                console.error('사용자 생성 실패:', userError.message)
                rl.close()
                resolve()
                return
              }

              console.log('사용자 생성 완료:', user.id)

              // tenant_users에 연결
              const { error: tenantUserError } = await supabase
                .from('tenant_users')
                .insert({
                  user_id: user.id,
                  tenant_id: tenantId,
                  role: 'operator_admin',
                })

              if (tenantUserError) {
                console.error('테넌트 연결 실패:', tenantUserError.message)
              } else {
                console.log('운영자 사용자 생성 완료!')
              }

              rl.close()
              resolve()
            } catch (error) {
              console.error('오류:', error.message)
              rl.close()
              resolve()
            }
          })
        })
      })
    })
  })
}

createAdminUser()



