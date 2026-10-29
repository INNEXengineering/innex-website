export const SITE = {
  name: 'INNEX Engineering',
  url: 'https://innexengineering.com',
  tagline: 'Forensic Mechanical Engineering & Safety Expert Witness',
  phone: '281-755-9177',
  phoneHref: 'tel:+12817559177',
  email: 'Paul@INNEXengineering.com',
  firmRegistration: 'Texas Registered Engineering Firm F-29716',
  // Set after Formspree signup (the part after /f/ in the form endpoint). Empty = mailto fallback.
  formspreeId: '',
  ogImage: '/og-image.png',
} as const;

export const EXPERT = {
  name: 'Paul Neumann',
  suffix: 'P.E., CMRP, CSP',
  path: '/about/paul-neumann-pe/',
  jobTitle: 'Principal Engineer and Expert Witness',
  experience: 'more than 20 years of practical, technical, academic, and operational experience',
  education: { degree: 'B.S., Mechanical Engineering', school: 'University of Illinois' },
  licenses: [
    'Professional Engineer (P.E.), Texas',
    'Professional Engineer (P.E.), Illinois',
    'Texas Apprentice Electrician',
  ],
  certifications: [
    'Certified Safety Professional (CSP)',
    'Certified Maintenance & Reliability Professional (CMRP)',
    'ASE Certified Technician: passenger car, light truck, heavy-duty truck',
  ],
  osha: [
    'OSHA General Industry, Construction, and Oil & Gas safety training',
    'OSHA Class 1-7 Powered Industrial Trucks: Train the Trainer Certification',
    'OSHA Boom Lift & Scissor Lift: Trainer Certification',
    'Competent person: scaffolding',
    'Competent person: fall protection',
    'Competent person: excavation',
  ],
  training: [
    'NFPA 70E electrical safety',
    'Vibration analysis, ISO 18436-2 Category II',
    'Root cause analysis',
    'ASME Section VIII Div. 1 & 2 pressure vessel design',
    'Bolted joint design',
    'Pumps and mechanical seals',
    'Lubrication',
    'Welding technology',
    'Hazardous materials, confined space, arc flash, and asbestos',
  ],
  knowsAbout: [
    'Forensic engineering', 'Mechanical engineering', 'Process safety management',
    'Process hazard analysis', 'Failure mode and effects analysis', 'Root cause analysis',
    'OSHA compliance', 'ASME pressure vessels', 'Rotating equipment', 'Pressure relief systems',
    'Powered industrial trucks', 'Construction safety', 'Workplace safety', 'Product liability',
  ],
} as const;
