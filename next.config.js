/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 브라우저 확장 프로그램이 추가한 속성 경고 무시
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

module.exports = nextConfig

