const CASE_TYPES = [
  'industrial-accidents', 'workplace-injury', 'construction-accidents', 'forklift-material-handling',
  'equipment-machinery-failure', 'product-liability', 'premises-liability',
  'trucking-trailer-heavy-equipment', 'vehicle-off-road-recreational',
];
const SERVICES = ['process-safety-pha', 'failure-analysis-fmea'];

// Indexable routes that must exist in dist/ and in the sitemap.
export const EXPECTED_ROUTES = [
  '/',
  ...CASE_TYPES.map((s) => `/case-types/${s}/`),
  ...SERVICES.map((s) => `/services/${s}/`),
];

// Routes that must exist but must NOT be indexed or listed in the sitemap.
export const NON_INDEXED_ROUTES = [];
