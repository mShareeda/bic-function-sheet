/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  // Allow server-side packages that use native binaries (argon2, @react-pdf/renderer)
  serverExternalPackages: ["argon2", "@react-pdf/renderer"],
};

export default nextConfig;
