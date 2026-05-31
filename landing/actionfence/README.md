This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## SEO, GEO, and Clarity Ops

Set these environment variables for production deploys:

- `NEXT_PUBLIC_SITE_URL` (default: `https://www.actionfence.dev`)
- `NEXT_PUBLIC_CLARITY_PROJECT_ID` (default: `wz8b6apxjk`)

Public discoverability endpoints:

- `https://www.actionfence.dev/robots.txt`
- `https://www.actionfence.dev/sitemap.xml`
- `https://www.actionfence.dev/llms.txt`
- `https://www.actionfence.dev/llms-full.txt`

Clarity verification checklist:

1. Open production site and inspect network requests.
2. Confirm script load from `https://www.clarity.ms/tag/wz8b6apxjk`.
3. Confirm event posts to `https://www.clarity.ms/collect`.
4. Verify sessions/heatmaps appear in the Clarity dashboard.
