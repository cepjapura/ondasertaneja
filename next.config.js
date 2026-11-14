/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Mitigação GHSA-2xp9-vwfh-vxw4: garantir que image/avif NÃO seja utilizado
    formats: ['image/webp'],
    // Mitigação GHSA-2464-fhr4-w9xw: garantir que dangerouslyAllowSVG permaneça desativado
    dangerouslyAllowSVG: false,
  },
};

module.exports = nextConfig;
