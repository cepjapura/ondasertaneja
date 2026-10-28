import type { Metadata } from 'next';
import { Bricolage_Grotesque, Inter } from 'next/font/google';
import Header from '@/components/Header';
import PlayerBar from '@/components/PlayerBar';
import Footer from '@/components/Footer';
import { ThemeProvider } from '@/components/ThemeProvider';
import '@/style.css';

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '800'],
  variable: '--font-bricolage',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Onda Sertaneja - A Rádio que Vive o Sertão',
  description: 'Onda Sertaneja — A plataforma digital da música sertaneja: perfis de artistas, agenda de shows, lançamentos e notícias. A batida que move o Brasil!',
  metadataBase: new URL('https://www.ondasertaneja.com.br'),
  openGraph: {
    title: 'Onda Sertaneja — A batida que move o Brasil',
    description: 'Notícias, agenda de shows, lançamentos e os maiores artistas do sertanejo 24h.',
    url: 'https://www.ondasertaneja.com.br/',
    siteName: 'Onda Sertaneja',
    locale: 'pt_BR',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${bricolageGrotesque.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎸</text></svg>" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body style={{ paddingBottom: '75px' }}>
        <ThemeProvider>
          <Header />
          {children}
          <Footer />
          <PlayerBar />

          {/* Botão Flutuante do WhatsApp */}
          <a
            id="btnWhatsappFloat"
            href="https://wa.me/5544999999999"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              position: 'fixed',
              bottom: '85px',
              right: '24px',
              zIndex: 9999,
              background: '#25D366',
              color: 'white',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.7rem',
              boxShadow: '0 4px 20px rgba(37,211,102,0.5)',
              textDecoration: 'none',
            }}
            title="Fale com a Onda Sertaneja no WhatsApp"
          >
            <i className="fa-brands fa-whatsapp"></i>
          </a>
        </ThemeProvider>
      </body>
    </html>
  );
}
