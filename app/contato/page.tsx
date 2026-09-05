import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contato & Anuncie na Onda Sertaneja | A Rádio do Sertão',
  description: 'Fale com a equipe do portal Onda Sertaneja. Divulgue seu show, envie sua música para nossa rádio ou solicite proposta comercial para sua marca.',
};

export default function ContatoPage() {
  return (
    <main className="main-content" style={{ paddingTop: '40px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}>
        {/* Banner do Topo */}
        <section
          style={{
            background: 'linear-gradient(135deg, rgba(255, 85, 0, 0.25) 0%, rgba(18, 20, 26, 0.95) 100%)',
            border: '1px solid var(--primary)',
            borderRadius: 'var(--radius-lg)',
            padding: '40px 30px',
            marginBottom: '40px',
          }}
        >
          <span className="hero-tag">
            <i className="fa-solid fa-headset"></i> ATENDIMENTO & COMERCIAL
          </span>
          <h1 style={{ fontSize: '2.5rem', margin: '12px 0', fontFamily: 'var(--font-title)' }}>
            Fale com a Onda Sertaneja
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', maxWidth: '650px', fontSize: '1.1rem' }}>
            Quer divulgar sua música na rádio, anunciar sua marca ou enviar uma pauta para nossa redação? Entre em contato conosco!
          </p>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '50px' }}>
          {/* Card WhatsApp Comercial */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '30px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#25D366',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                margin: '0 auto 20px',
              }}
            >
              <i className="fa-brands fa-whatsapp"></i>
            </div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Atendimento via WhatsApp</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '20px' }}>
              Fale diretamente com nossa equipe comercial para propostas de rádio, parcerias e patrocínios de eventos.
            </p>
            <a
              href="https://wa.me/5544999999999?text=Ol%C3%A1!%20Vim%20pelo%20site%20Onda%20Sertaneja%20e%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es."
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
              style={{ display: 'inline-flex', width: '100%', justifyContent: 'center', textDecoration: 'none' }}
            >
              <i className="fa-brands fa-whatsapp"></i> Iniciar Conversa
            </a>
          </div>

          {/* Card Envio de Músicas / Imprensa */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '30px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                margin: '0 auto 20px',
              }}
            >
              <i className="fa-solid fa-envelope"></i>
            </div>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Redação & Imprensa</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '20px' }}>
              Envie comunicados de imprensa, lançamentos de singles e agendas de shows para nossa equipe editorial.
            </p>
            <a
              href="mailto:contato@ondasertaneja.com.br"
              className="btn-outline-primary"
              style={{ display: 'inline-flex', width: '100%', justifyContent: 'center', textDecoration: 'none' }}
            >
              <i className="fa-solid fa-paper-plane"></i> contato@ondasertaneja.com.br
            </a>
          </div>
        </div>

        {/* Formulário de Mensagem */}
        <section
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '35px',
            marginBottom: '50px',
          }}
        >
          <h2 style={{ fontSize: '1.6rem', marginBottom: '20px', fontFamily: 'var(--font-title)' }}>
            Envie uma mensagem direta
          </h2>
          <form style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Seu Nome *</label>
              <input
                type="text"
                placeholder="Ex: João da Silva"
                required
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  fontSize: '0.95rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Seu E-mail *</label>
              <input
                type="email"
                placeholder="Ex: joao@email.com"
                required
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  fontSize: '0.95rem',
                }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Assunto</label>
              <select
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#181a20',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  fontSize: '0.95rem',
                }}
              >
                <option value="anuncio">Anuncie no Onda Sertaneja (Publicidade)</option>
                <option value="musica">Divulgação de Música / Artista</option>
                <option value="shows">Divulgação de Shows e Eventos</option>
                <option value="outro">Outros Assuntos</option>
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Sua Mensagem *</label>
              <textarea
                rows={5}
                placeholder="Escreva detalhes da sua mensagem..."
                required
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-color)',
                  color: '#fff',
                  fontSize: '0.95rem',
                  resize: 'vertical',
                }}
              ></textarea>
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
              <button type="submit" className="btn-primary" style={{ padding: '12px 30px', fontSize: '1rem' }}>
                <i className="fa-solid fa-paper-plane"></i> Enviar Mensagem
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
