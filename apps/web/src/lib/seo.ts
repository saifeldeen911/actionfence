export interface SiteMetadata {
  metadataBase: URL;
  title: {
    default: string;
    template: string;
  };
  description: string;
  alternates: {
    canonical: string;
  };
  openGraph: {
    title: string;
    description: string;
    url: string;
    siteName: string;
    locale: string;
    type: 'website';
    images: Array<{
      url: string;
      width: number;
      height: number;
      alt: string;
    }>;
  };
  twitter: {
    card: 'summary_large_image';
    title: string;
    description: string;
    images: string[];
  };
  applicationName: string;
  category: string;
  keywords: string[];
}

export interface SoftwareSourceCodeJsonLd {
  '@context': 'https://schema.org';
  '@type': 'SoftwareSourceCode';
  name: string;
  description: string;
  codeRepository: string;
  programmingLanguage: string[];
  runtimePlatform: string;
  license: string;
  url: string;
}

export interface FaqJsonLd {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }>;
}

export const siteCopy = {
  name: 'ActionFence',
  title: 'ActionFence — AI Action Firewall for MCP Servers & APIs',
  description:
    'Open-source middleware that enforces JSON policies on AI agent actions. Identity tiers, spend caps, rate limits, and signed receipts for every decision. Works with MCP servers, Express, and Fastify.',
  repoUrl: 'https://github.com/saifeldeen911/actionfence',
  domain: 'actionfence.dev',
};

export function getSiteUrl(): string {
  const raw =
    process.env.SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000';

  const normalized = raw.startsWith('http') ? raw : `https://${raw}`;
  return normalized.replace(/\/+$/, '');
}

export function createSiteMetadata(): SiteMetadata {
  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: siteCopy.title,
      template: '%s | ActionFence',
    },
    description: siteCopy.description,
    applicationName: siteCopy.name,
    category: 'developer tools',
    keywords: [
      'AI agent firewall',
      'MCP server security',
      'MCP middleware',
      'AI action policy',
      'agent spend limits',
      'signed receipts',
      'policy enforcement',
      'ActionFence',
      'AI security npm package',
      'MCP tool guard',
      'AI agent rate limiting',
      'MCP server middleware',
      'agent identity verification',
      'JWT agent verification',
    ],
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title: siteCopy.title,
      description: siteCopy.description,
      url: '/',
      siteName: siteCopy.name,
      locale: 'en_US',
      type: 'website',
      images: [
        {
          url: '/opengraph-image',
          width: 1200,
          height: 630,
          alt: 'ActionFence — AI Action Firewall for MCP servers and APIs',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: siteCopy.title,
      description: siteCopy.description,
      images: ['/opengraph-image'],
    },
  };
}

export function buildSoftwareSourceCodeJsonLd(): SoftwareSourceCodeJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: siteCopy.name,
    description: siteCopy.description,
    codeRepository: siteCopy.repoUrl,
    programmingLanguage: ['TypeScript', 'JavaScript'],
    runtimePlatform: 'Node.js 20+',
    license: 'https://opensource.org/licenses/MIT',
    url: getSiteUrl(),
  };
}

export function buildFaqJsonLd(): FaqJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is ActionFence?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'ActionFence is an open-source npm package that acts as an AI action firewall for MCP servers and HTTP APIs. It enforces JSON-based policies on incoming agent actions, providing identity verification, spend caps, rate limits, and cryptographically signed receipts.',
        },
      },
      {
        '@type': 'Question',
        name: 'How do I install ActionFence?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Run `npm install actionfence` in your project. Then wrap your MCP server with `withGuard(server, { policy: \'./guard-policy.json\' })` or use `guard()` as Express/Fastify middleware.',
        },
      },
      {
        '@type': 'Question',
        name: 'Does ActionFence work with MCP servers?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. ActionFence provides a `withGuard()` function that wraps any MCP server instance and intercepts tool calls to enforce your guard-policy.json rules before the tool handler executes.',
        },
      },
      {
        '@type': 'Question',
        name: 'What are signed receipts in ActionFence?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Every enforced decision produces a hash-chained, HMAC-SHA256 signed receipt stored in SQLite. Receipts are append-only and verifiable, creating a tamper-evident audit trail of all agent actions.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is ActionFence free and open source?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. ActionFence is released under the MIT license and is completely free to use in both personal and commercial projects.',
        },
      },
    ],
  };
}
