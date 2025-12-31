// 비밀번호 재설정 스크립트
// 사용법: node scripts/reset-password.js

const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 설정하세요.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function resetPassword() {
  const email = 'admin@o2pluss.com'
  const password = 'admin123'
  
  console.log('비밀번호 해시 생성 중...')
  const passwordHash = await bcrypt.hash(password, 10)
  console.log('생성된 해시:', passwordHash)
  
  // 기존 사용자 확인
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, email, password_hash')
    .eq('email', email)
    .single()
  
  if (existingUser) {
    console.log('기존 사용자 발견:', existingUser.email)
    console.log('기존 해시:', existingUser.password_hash)
    
    // 비밀번호 업데이트
    const { error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('email', email)
    
    if (error) {
      console.error('업데이트 실패:', error)
    } else {
      console.log('비밀번호 업데이트 완료!')
      
      // 검증
      const isValid = await bcrypt.compare(password, passwordHash)
      console.log('검증 결과:', isValid ? '성공' : '실패')
    }
  } else {
    console.log('사용자를 찾을 수 없습니다.')
  }
}

resetPassword().catch(console.error)




