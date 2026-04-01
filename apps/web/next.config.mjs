/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@nexus/db", "@nexus/shared"],
  serverExternalPackages: ["rivetkit", "@rivetkit/next-js"],
};

export default nextConfig;
