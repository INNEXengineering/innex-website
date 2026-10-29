import { SITE, EXPERT } from '../site.config';

const abs = (path: string) => new URL(path, SITE.url).href;
export const ORG_ID = `${SITE.url}/#organization`;
export const PERSON_ID = `${SITE.url}${EXPERT.path}#person`;

export function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE.name,
    url: `${SITE.url}/`,
    logo: abs('/logo.png'),
    image: abs(SITE.ogImage),
    telephone: `+1-${SITE.phone}`,
    email: SITE.email,
    description:
      'Independent forensic mechanical engineering, industrial and construction safety analysis, and expert witness services for plaintiff and defense counsel.',
    areaServed: { '@type': 'Country', name: 'United States' },
    founder: { '@id': PERSON_ID },
    employee: { '@id': PERSON_ID },
    knowsAbout: EXPERT.knowsAbout,
  };
}

export function personSchema() {
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: EXPERT.name,
    honorificSuffix: EXPERT.suffix,
    jobTitle: EXPERT.jobTitle,
    url: abs(EXPERT.path),
    worksFor: { '@id': ORG_ID },
    alumniOf: { '@type': 'CollegeOrUniversity', name: EXPERT.education.school },
    hasCredential: [
      ...EXPERT.licenses.map((name) => ({ name, credentialCategory: 'license' })),
      ...EXPERT.certifications.map((name) => ({ name, credentialCategory: 'certification' })),
    ].map((c) => ({ '@type': 'EducationalOccupationalCredential', ...c })),
    knowsAbout: EXPERT.knowsAbout,
  };
}

export function serviceSchema(name: string, description: string, path: string) {
  return {
    '@type': 'Service',
    name,
    description,
    url: abs(path),
    provider: { '@id': ORG_ID },
    areaServed: { '@type': 'Country', name: 'United States' },
  };
}

export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

export type Crumb = { name: string; href: string };

export function breadcrumbSchema(crumbs: Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: abs(c.href),
    })),
  };
}
