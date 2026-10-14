/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep `ws` out of the server bundle: bundling it breaks its optional native
  // deps (bufferutil / utf-8-validate) and the upstream socket fails at runtime.
  serverExternalPackages: ["ws"],
};

export default nextConfig;
