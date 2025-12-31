/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 브라우저 확장 프로그램이 추가한 속성 경고 무시
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // 서버 사이드에서 폰트 파일 접근을 위해 webpack 설정
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 서버 빌드 시 lib/fonts 폴더를 포함
      config.resolve.alias = {
        ...config.resolve.alias,
      }
    }
    return config
  },
}

module.exports = nextConfig

