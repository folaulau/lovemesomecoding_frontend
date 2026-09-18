import { allCategories, allPageUrls, type Category } from './content';

/**
 * Top-level nav groups, mirroring the menu the WordPress site shipped.
 * Every non-empty category slug appears at most once; a category may be left
 * out deliberately (see algorithm-interview below).
 */
export const NAV_GROUPS: { label: string; slugs: string[] }[] = [
  {
    label: 'Java',
    // java-8 and java-advanced were folded into `java` (2026-08-20) and no
    // longer exist as categories; their URLs 301 to /java.
    slugs: ['java', 'java-interview', 'spring-boot',
      'spring-data', 'spring-study-guide', 'spring-interview', 'data-structure-algorithm'],
  },
  { label: 'Python', slugs: ['python', 'python-advanced', 'flask', 'fastapi', 'machine-learning'] },
  {
    label: 'Data Store',
    slugs: ['sql', 'oracle', 'postgre', 'elasticsearch', 'hasura', 'mongodb', 'snowflake'],
  },
  {
    label: 'Software Engineering',
    // algorithm-interview was pulled out of the dropdown (2026-08-24); the
    // category and its URLs still resolve, it just isn't linked from the nav.
    // brainteaser was retired (2026-08-24) — its one post was an empty stub, so
    // the category is gone from the content DB and both URLs 301 to /.
    slugs: ['swedesignpattern', 'system-design', 'backend-dev', 'frontend-dev', 'soft-skills',
      'softwaredevelopmentbestpractice', 'fundamental-problem',
      'how-it-works'],
  },
  {
    // Added 2026-09-18. A new top-level group rather than a slot in an existing one: iOS is not
    // JavaScript and it is not general software engineering, and a reader looking for mobile
    // should not have to guess which dropdown it was filed under.
    //
    // `react-native` deliberately stays under JavaScript for now. It is a mobile framework and it
    // would read well here, but moving it changes where an existing category appears in the nav,
    // and that is a separate decision from adding a new one. Folau's call, 2026-09-18.
    label: 'Mobile',
    slugs: ['ios'],
  },
  {
    label: 'JavaScript',
    // typescript added 2026-09-05 — a new category, sat next to `javascript` because that is
    // the reading order, not alphabetical.
    // nestjs added 2026-09-05, straight after `typescript` for the same reason: Nest is
    // TypeScript applied to a server, and reads as the lesson after the language.
    slugs: ['javascript', 'typescript', 'nestjs', 'react', 'react-native', 'angular', 'vue'],
  },
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
  oracle: 'Oracle',
  'system-design': 'System Design',
  'backend-dev': 'Backend Development',
  'frontend-dev': 'Frontend Development',
  'spring-interview': 'Spring Interview',
  sql: 'SQL',
  // The content DB will hold this as "Ios" or "iOS" depending on how it is seeded; pinning the
  // label here means the nav always reads correctly whatever the category record says.
  ios: 'iOS',
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
