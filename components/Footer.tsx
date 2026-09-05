import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <h3>ONDA<span>SERTANEJA</span></h3>
          <p>A batida que move o Brasil. As melhores músicas e notícias você encontra aqui, 24 horas por dia com você.</p>
          <div className="social-links">
            <a href="https://instagram.com/ondasertaneja" target="_blank" rel="noreferrer"><i className="fa-brands fa-instagram"></i></a>
            <a href="https://tiktok.com/@ondasertaneja" target="_blank" rel="noreferrer"><i className="fa-brands fa-tiktok"></i></a>
            <a href="https://youtube.com/@ondasertaneja" target="_blank" rel="noreferrer"><i className="fa-brands fa-youtube"></i></a>
            <a href="https://open.spotify.com" target="_blank" rel="noreferrer"><i className="fa-brands fa-spotify"></i></a>
          </div>
        </div>

        <div className="footer-links">
          <h4>Navegação</h4>
          <ul>
            <li><Link href="/">Início</Link></li>
            <li><Link href="/#noticias">Notícias</Link></li>
            <li><Link href="/agenda">Agenda de Shows</Link></li>
            <li><Link href="/lancamentos">Lançamentos</Link></li>
            <li><Link href="/contato">Contato & Anuncie</Link></li>
          </ul>
        </div>

        <div className="footer-links">
          <h4>Legal</h4>
          <ul>
            <li><a href="#">Política de Privacidade</a></li>
            <li><a href="#">Termos de Uso</a></li>
            <li><a href="#">Direitos Autorais</a></li>
            <li><a href="#">Mídia Kit</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 Onda Sertaneja. Todos os direitos reservados.</p>
        <p className="disclaimer">Website otimizado para a melhor experiência musical.</p>
      </div>
    </footer>
  );
}
