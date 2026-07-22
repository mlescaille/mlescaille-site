const SITE = 'https://www.mlescaille.com';

const SECTION_LABELS = {
  systems: 'systems-and-craft',
  tech: 'working-in-tech',
  essays: 'essays',
  archive: 'field-notes-and-archive',
};

const DEFAULT_TOPICS = {
  systems: ['software-systems', 'engineering-practice'],
  tech: ['working-in-tech'],
  essays: ['essays'],
  archive: ['technical-archive'],
};

export function sectionFor(entry) {
  if (entry.data.kind === 'poem') return 'poetry';
  if (entry.data.kind === 'code · poems') return 'code-poetry';
  return SECTION_LABELS[entry.data.shelf] ?? entry.data.shelf;
}

export function contentTypeFor(entry) {
  if (entry.data.kind === 'code · poems') return 'codem';
  return entry.data.kind;
}

export function statusFor(entry) {
  return entry.data.status ?? (entry.data.shelf === 'archive' ? 'archived' : 'current');
}

export function topicsFor(entry) {
  if (entry.data.topics?.length) return entry.data.topics;
  if (entry.data.kind === 'poem') return ['poetry'];
  if (entry.data.kind === 'code · poems') return ['code-poetry', 'creative-coding'];
  return DEFAULT_TOPICS[entry.data.shelf] ?? [entry.data.kind];
}

export function canonicalUrlFor(entry) {
  if (entry.data.canonicalUrl) return entry.data.canonicalUrl;
  if (entry.data.external) return entry.data.external;
  const section = entry.data.kind === 'poem' ? 'poetry' : 'writing';
  return `${SITE}/${section}/${entry.id}/`;
}

export function markdownUrlFor(entry) {
  if (entry.data.external) return null;
  const section = entry.data.kind === 'poem' ? 'poetry' : 'writing';
  return `${SITE}/${section}/${entry.id}/index.md`;
}

export function descriptionFor(entry, maxLength = 160) {
  const explicit = entry.data.description ?? entry.data.note;
  if (explicit?.trim()) return explicit.trim();

  const plainText = entry.body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (plainText.length <= maxLength) return plainText;
  const shortened = plainText.slice(0, maxLength + 1);
  const boundary = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, boundary > 80 ? boundary : maxLength).trim()}…`;
}

export function normalizedMetadata(entry) {
  return {
    title: entry.data.title,
    url: canonicalUrlFor(entry),
    markdownUrl: markdownUrlFor(entry),
    contentType: contentTypeFor(entry),
    section: sectionFor(entry),
    topics: topicsFor(entry),
    language: entry.data.lang,
    publishedAt: entry.data.date.toISOString().slice(0, 10),
    updatedAt: (entry.data.updatedAt ?? entry.data.date).toISOString().slice(0, 10),
    status: statusFor(entry),
    author: entry.data.author,
    description: descriptionFor(entry),
  };
}

export function structuredDataFor(entry) {
  const metadata = normalizedMetadata(entry);
  const isCreativeWork = metadata.contentType === 'poem' || metadata.contentType === 'codem';

  const section = entry.data.kind === 'poem' ? 'poetry' : 'writing';
  const sectionName = entry.data.kind === 'poem' ? 'Poetry' : 'Writing';
  const work = {
    '@type': isCreativeWork ? 'CreativeWork' : 'BlogPosting',
    '@id': `${metadata.url}#work`,
    url: metadata.url,
    headline: metadata.title,
    name: metadata.title,
    description: metadata.description || undefined,
    mainEntityOfPage: metadata.url,
    datePublished: entry.data.date.toISOString(),
    dateModified: (entry.data.updatedAt ?? entry.data.date).toISOString(),
    inLanguage: metadata.language,
    genre: metadata.contentType,
    keywords: metadata.topics.join(', '),
    author: {
      '@type': 'Person',
      '@id': `${SITE}/#person`,
      name: 'Mari Lescaille',
      url: `${SITE}/about/`,
    },
    isPartOf: { '@id': `${SITE}/#website` },
  };

  const breadcrumbs = {
    '@type': 'BreadcrumbList',
    '@id': `${metadata.url}#breadcrumbs`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: sectionName, item: `${SITE}/${section}/` },
      { '@type': 'ListItem', position: 3, name: metadata.title, item: metadata.url },
    ],
  };

  return [work, breadcrumbs];
}

export function markdownDocument(entry) {
  const metadata = normalizedMetadata(entry);
  const frontmatter = [
    '---',
    `title: ${JSON.stringify(metadata.title)}`,
    `description: ${JSON.stringify(metadata.description)}`,
    `contentType: ${JSON.stringify(metadata.contentType)}`,
    `section: ${JSON.stringify(metadata.section)}`,
    'topics:',
    ...metadata.topics.map(topic => `  - ${JSON.stringify(topic)}`),
    `language: ${JSON.stringify(metadata.language)}`,
    `publishedAt: ${metadata.publishedAt}`,
    `updatedAt: ${metadata.updatedAt}`,
    `status: ${JSON.stringify(metadata.status)}`,
    `author: ${JSON.stringify(metadata.author)}`,
    `canonicalUrl: ${JSON.stringify(metadata.url)}`,
    '---',
  ];

  return `${frontmatter.join('\n')}\n\n# ${metadata.title}\n\n${entry.body.trim()}\n`;
}
