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
    description: entry.data.description ?? entry.data.note ?? '',
  };
}

export function structuredDataFor(entry) {
  const metadata = normalizedMetadata(entry);
  const isCreativeWork = metadata.contentType === 'poem' || metadata.contentType === 'codem';

  return {
    '@type': isCreativeWork ? 'CreativeWork' : 'BlogPosting',
    '@id': `${metadata.url}#work`,
    url: metadata.url,
    headline: metadata.title,
    name: metadata.title,
    description: metadata.description || undefined,
    datePublished: metadata.publishedAt,
    dateModified: metadata.updatedAt,
    inLanguage: metadata.language,
    genre: metadata.contentType,
    keywords: metadata.topics.join(', '),
    author: { '@id': `${SITE}/#person` },
    isPartOf: { '@id': `${SITE}/#website` },
  };
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
