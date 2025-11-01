import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'chat bot',
  description: 'chat bot web site',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}