import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Explode Studio — CAD assembly animation', description: 'Create exploded CAD drawings and animations locally with Python and Three.js.' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
