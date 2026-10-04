import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'THERMOS 2.0 — Deterministic Microgrid & Demand Flexibility Engine',
  description:
    'Smart Buildings · Energy Efficiency & Occupant Experience · Grid Integration. Deterministic building-level optimization, P2P microgrid market clearing, and VPP demand response simulation.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="font-body-md text-on-surface antialiased bg-surface min-h-screen selection:bg-secondary-container selection:text-on-secondary-container">
        <Header />
        <Sidebar />
        <div className="pl-64">
          <main className="relative w-full pt-28 bg-surface px-gutter-desktop py-space-lg min-h-screen">
            {children}
          </main>
          <footer className="border-t border-surface-container-high/80 py-4 px-gutter-desktop text-center text-on-surface-variant bg-surface">
            <p className="font-telemetry-sm text-telemetry-sm">
              THERMOS 2.0 Simulation Engine · Sector 47, Gurugram (simulated) · All figures derived from
              deterministic multi-pass physics model. Assumptions documented on /methodology.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
