document.addEventListener('DOMContentLoaded', () => {
  fetch('/api/artists')
    .then(res => {
      if (!res.ok) throw new Error('Erro ao carregar artistas');
      return res.json();
    })
    .then(data => renderArtistas(data))
    .catch(err => {
      console.error(err);
      const container = document.getElementById('artistasDestaque');
      if (container) {
        container.innerHTML = '<p style="color: var(--text-muted); width: 100%; text-align: center;">Erro ao carregar artistas no momento.</p>';
      }
    });

  function renderArtistas(artistas) {
    const container = document.getElementById('artistasDestaque');
    if (!container) return;

    container.innerHTML = '';

    if (!artistas || artistas.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); width: 100%; text-align: center;">Nenhum artista em destaque.</p>';
      return;
    }

    artistas.forEach(artista => {
      const card = document.createElement('div');
      // Adicionando card, e classes que dão o estilo arredondado
      card.className = 'artist-card';
      card.style.position = 'relative';
      card.style.background = 'var(--bg-card)';
      card.style.border = '1px solid var(--border-color)';
      card.style.borderRadius = 'var(--radius-md)';
      card.style.padding = '15px';
      card.style.textAlign = 'center';
      card.style.transition = 'var(--transition)';

      const imgSrc = artista.avatarUrl || artista.imagem || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80';
      const slugOrName = artista.slug || encodeURIComponent(artista.nome || artista.name);

      card.innerHTML = `
        ${(artista.isFeatured || artista.patrocinado) ? '<span class="tag tag-exclusive" style="position: absolute; top: 10px; right: 10px; z-index: 10;">Destaque</span>' : ''}
        <div style="width: 100%; height: 200px; border-radius: var(--radius-sm); overflow: hidden; margin-bottom: 15px;">
           <img src="${imgSrc}" alt="${artista.name || artista.nome}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover;">
        </div>
        <h3 style="font-family: var(--font-title); font-size: 1.2rem; margin-bottom: 15px;">${artista.name || artista.nome}</h3>
        <a class="btn-outline-primary" style="width: 100%; justify-content: center;" href="artista.html?nome=${slugOrName}">
           <i class="fa-solid fa-calendar-days"></i> Ver Agenda
        </a>
      `;

      // Efeito Hover sutil via JS ou CSS In-line (Aqui aproveitamos a classe base do css, mas aplicamos evento js)
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-5px)';
        card.style.borderColor = 'var(--primary)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.borderColor = 'var(--border-color)';
      });

      container.appendChild(card);
    });
  }
});
