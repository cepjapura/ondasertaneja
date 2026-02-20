document.addEventListener('DOMContentLoaded', () => {
    fetch('noticias.json')
        .then(res => {
            if (!res.ok) throw new Error('Erro ao carregar noticias.json');
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

            article.innerHTML = `
        <a href="${noticia.link}" style="text-decoration: none; color: inherit; display: block; height: 100%;">
          <div class="news-img" style="background-image: url('${noticia.imagem}');">
            <span class="tag ${noticia.classeTag}">${noticia.tag}</span>
          </div>
          <div class="news-content">
            <span class="news-date">${noticia.data}</span>
            <h3>${noticia.titulo}</h3>
            <p>${noticia.resumo}</p>
          </div>
        </a>
      `;

            container.appendChild(article);
        });
    }
});
