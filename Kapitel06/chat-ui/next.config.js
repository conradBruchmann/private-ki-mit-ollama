/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ollama Server für lokale Entwicklung
  async rewrites() {
    return [
      {
        source: "/ollama/:path*",
        destination: "http://localhost:11434/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
