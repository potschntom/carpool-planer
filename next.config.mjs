/** @type {import('next').NextConfig} */
const isPages = process.env.GITHUB_ACTIONS === "true" || process.env.NODE_ENV === "production";

const nextConfig = {
  ...(isPages
    ? {
        output: "export",
        basePath: "/carpool-planer",
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
