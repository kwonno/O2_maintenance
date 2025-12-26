-- 초기 운영자 사용자 생성 예시
-- 비밀번호: admin123 (실제 운영 시 반드시 변경하세요!)
-- bcrypt 해시는 온라인 도구나 애플리케이션에서 생성해야 합니다.

-- 사용 예시:
-- 1. 먼저 테넌트를 생성합니다
-- INSERT INTO tenants (name) VALUES ('운영사');

-- 2. 사용자를 생성합니다 (비밀번호 해시는 애플리케이션에서 생성)
-- INSERT INTO users (email, password_hash, name) 
-- VALUES ('admin@example.com', '$2a$10$...', '운영자');

-- 3. tenant_users에 연결합니다
-- INSERT INTO tenant_users (user_id, tenant_id, role)
-- VALUES (
--   (SELECT id FROM users WHERE email = 'admin@example.com'),
--   (SELECT id FROM tenants WHERE name = '운영사'),
--   'operator_admin'
-- );

-- 참고: 실제 비밀번호 해시는 Node.js에서 생성해야 합니다:
-- const bcrypt = require('bcryptjs');
-- const hash = await bcrypt.hash('your-password', 10);
-- console.log(hash);

