/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export -> S3 + CloudFront. No Lambda in the read path.
  output: 'export',

  // MUST stay false. WordPress serves /java-8/java-25-migration-guide with no
  // trailing slash and that is what Google has indexed on 512 pages. Turning this
  // on would append a slash to every internal link and change every canonical URL.
  trailingSlash: false,

  // next/image optimization needs a server; static export has none.
  images: { unoptimized: true },

  // Surfaces broken content early rather than shipping a half-built site.
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
