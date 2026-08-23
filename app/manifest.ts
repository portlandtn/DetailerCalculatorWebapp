import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Detailer Calculator',
    short_name: 'Detailer Calc',
    description: 'Mobile-first RPN calculator for architectural detailing math.',
    start_url: '/',
    display: 'standalone',
    background_color: '#080e14',
    theme_color: '#111a24',
    orientation: 'portrait-primary',
    icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
