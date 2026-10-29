import type { ImageMetadata } from 'astro';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Optional client asset: "View CV" links appear only once the PDF is dropped into public/.
export const CV_FILE = 'paul-neumann-pe-cv.pdf';
export const CV_HREF = `/${CV_FILE}`;
export const hasCv = existsSync(join(process.cwd(), 'public', CV_FILE));

// Optional client asset: the headshot. The build must succeed whether or not it has been supplied.
const headshots = import.meta.glob<{ default: ImageMetadata }>('../assets/paul-neumann.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', { eager: true });
export const headshot: ImageMetadata | undefined = Object.values(headshots)[0]?.default;
