import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/clinic/', '/api/'],
      },
    ],
    sitemap: 'https://medivoice.ai/sitemap.xml',
  }
}
