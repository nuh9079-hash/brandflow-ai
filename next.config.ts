import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  redirects() {
    return [
      { source: "/login", destination: "/sign-in", permanent: false },
      { source: "/signup", destination: "/sign-up", permanent: false },
    ];
  },
  allowedDevOrigins: ['brandflow3678.builtwithrocket.new'],
  turbopack: {},
  webpack(config, { dev }) {
    if (dev) {
      config.module.rules.push({
        test: /\.(jsx|tsx)$/,
        exclude: [/node_modules/],
        use: [{
          loader: '@dhiwise/component-tagger/nextLoader',
        }],
      });
    }

    return config;
  }
};

export default nextConfig;
