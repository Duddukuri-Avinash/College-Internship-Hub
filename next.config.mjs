/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['mssql', 'msnodesqlv8'],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
