import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: { default: process.env.NEXT_PUBLIC_APP_NAME || 'Southbase Sign', template: `%s · ${process.env.NEXT_PUBLIC_APP_NAME || 'Southbase Sign'}` }, description: 'Säker elektronisk signering för vanliga elektroniska underskrifter.' };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="sv"><body>{children}</body></html>}
