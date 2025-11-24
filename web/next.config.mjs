/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    config.experiments = { ...(config.experiments || {}), asyncWebAssembly: true }
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    })
    if (!isServer) {
      config.resolve.fallback = { ...(config.resolve.fallback || {}), fs: false, path: false }
    }
    return config
  },
}

export default nextConfig
