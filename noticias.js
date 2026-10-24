document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/news')
        .then(res => {
            if (!res.ok) throw new Error('Erro ao carregar notícias');
            return res.json();
        })
        .then(data => renderNoticias(data))
        .catch(err => {
            console.error(err);
            const container = document.getElementById('noticiasGrid');
            if (container) {
                container.innerHTML = '<p style="color: var(--text-muted); width: 100%; text-align: center;">Erro ao carregar notícias no momento.</p>';
            }
        });

    function renderNoticias(noticias) {
        const container = document.getElementById('noticiasGrid');
        if (!container) return;

        container.innerHTML = '';

        if (!noticias || noticias.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); width: 100%; text-align: center;">Nenhuma notícia publicada ainda.</p>';
            return;
        }

        noticias.forEach(noticia => {
            const article = document.createElement('article');
            article.className = 'news-card';

            const tagClass = noticia.trustType === 'confirmed' ? 'tag-hot' : 'tag-release';
            const tagLabel = noticia.trustType === 'confirmed' ? 'Confirmado' : (noticia.category || 'Notícia');

            article.innerHTML = `
        <a href="noticia.html?id=${noticia.slug}" style="text-decoration: none; color: inherit; display: block; height: 100%;">
          <div class="news-img" style="background-image: url('${noticia.coverUrl || noticia.imagem || ''}');">
            <span class="tag ${tagClass}">${tagLabel}</span>
          </div>
          <div class="news-content">
            <span class="news-date">${new Date(noticia.publishedAt || Date.now()).toLocaleDateString('pt-BR')}</span>
            <h3>${noticia.title || noticia.titulo}</h3>
            <p>${noticia.summary || noticia.resumo}</p>
          </div>
        </a>
      `;

            container.appendChild(article);
        });
    }
});
