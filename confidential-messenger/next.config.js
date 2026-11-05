/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack(config) {
    config.resolve.alias['libsodium-wrappers$'] = require('path').resolve(
      __dirname,
      'node_modules/libsodium-wrappers/dist/modules/libsodium-wrappers.js'
    );
    return config;
  },
};
module.exports = nextConfig;
