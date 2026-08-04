import { allCategories, allPageUrls, type Category } from './content';

/**
 * Top-level nav groups, mirroring the menu the WordPress site shipped.
 * Every one of the 43 non-empty category slugs appears exactly once.
 */
export const NAV_GROUPS: { label: string; slugs: string[] }[] = [
  {
    label: 'Java',
    slugs: ['java', 'java-8', 'java-advanced', 'java-interview', 'spring-boot',
      'spring-data', 'spring-study-guide', 'spring-interview', 'data-structure-algorithm'],
  },
  { label: 'Python', slugs: ['python', 'python-advanced', 'flask', 'fastapi', 'machine-learning'] },
  { label: 'Data Store', slugs: ['sql', 'postgre', 'elasticsearch', 'hasura', 'mongodb', 'snowflake'] },
  {
    label: 'Software Engineering',
    slugs: ['swedesignpattern', 'system-design', 'backend-dev', 'frontend-dev', 'soft-skills',
      'softwaredevelopmentbestpractice', 'algorithm-interview', 'fundamental-problem',
      'how-it-works', 'brainteaser'],
  },
  { label: 'JavaScript', slugs: ['javascript', 'react', 'rea-native', 'angular'] },
  { label: 'HTML & CSS', slugs: ['html', 'css'] },
  { label: 'DevOps', slugs: ['aws', 'terraform', 'linux', 'docker', 'misc'] },
  { label: 'Git', slugs: ['git'] },
  { label: 'AI', slugs: ['claude'] },
];

/**
 * Display-name fixes. The URL slugs are deliberately left alone — 512 indexed
 * pages hang off them — so only the labels are corrected here.
 */
const DISPLAY_NAMES: Record<string, string> = {
  'java-8': 'Java 8+ Features',
  'rea-native': 'React Native',
  postgre: 'Postgres',
  swedesignpattern: 'Design Patterns',
  softwaredevelopmentbestpractice: 'Best Practices',
  'fundamental-problem': 'Fundamental Problems',
  'how-it-works': 'How It Works',
  'data-structure-algorithm': 'Data Structures & Algorithms',
  python: 'Python',
  'python-advanced': 'Python Advanced',
  flask: 'Flask',
  fastapi: 'FastAPI',
  linux: 'Linux',
  hasura: 'Hasura',
  mongodb: 'MongoDB',
  terraform: 'Terraform',
  docker: 'Docker',
  snowflake: 'Snowflake',
  'system-design': 'System Design',
  'backend-dev': 'Backend Development',
  'frontend-dev': 'Frontend Development',
  'spring-interview': 'Spring Interview',
  sql: 'SQL',
  aws: 'AWS',
  css: 'CSS',
  html: 'HTML',
};

export function displayName(category: Category): string {
  return DISPLAY_NAMES[category.slug] ?? category.name;
}

export function displayNameForSlug(slug: string): string {
  const category = allCategories().find((c) => c.slug === slug);
  return category ? displayName(category) : slug;
}

/** Nav groups resolved to real categories, dropping any that no longer exist. */
export function navTree() {
  const bySlug = new Map(allCategories().map((c) => [c.slug, c]));
  return NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.slugs
      .map((slug) => bySlug.get(slug))
      .filter((c): c is Category => Boolean(c))
      .map((c) => ({ slug: c.slug, name: displayName(c), count: c.count, url: c.url })),
  })).filter((g) => g.items.length > 0);
}

/**
 * A category's landing URL. Seven category slugs are shadowed by a hand-written
 * page of the same name; linking to `/slug` therefore lands on that page, which
 * is exactly what happens on the live site today.
 */
export function categoryUrl(slug: string): string {
  return `/${slug}`;
}

/**
 * Standalone nav entries — plain links rather than category dropdowns.
 * Filtered against the pages that actually exist so a retired page can never
 * leave a dead link in the navbar.
 */
const NAV_LINKS = [{ label: 'About Me', href: '/about-me' }];

export function navLinks(): { label: string; href: string }[] {
  const available = new Set(allPageUrls().map((u) => `/${u}`));
  return NAV_LINKS.filter((link) => available.has(link.href));
}

/** Pages that belong in the footer rather than the main nav. */
export const FOOTER_PAGES = [
  'about-me', 'contact', 'privacy-policy', 'terms-and-conditions', 'cookie-policy',
];

export function footerPages(): string[] {
  const available = new Set(allPageUrls());
  return FOOTER_PAGES.filter((p) => available.has(p));
}
