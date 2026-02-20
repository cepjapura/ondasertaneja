document.addEventListener('DOMContentLoaded', () => {
    fetch('lancamentos.json')
        .then(res => {
            if (!res.ok) throw new Error('Erro ao carregar lancamentos.json');
            return res.json();
        })
        .then(data => renderLancamentos(data))
        .catch(err => {
            console.error(err);
            const container = document.getElementById('lancamentosGrid');
            if (container) {
                container.innerHTML = '<p style="color: var(--text-muted); width: 100%; text-align: center;">Erro ao carregar lançamentos.</p>';
            }
        });

    function renderLancamentos(lancamentos) {
        const container = document.getElementById('lancamentosGrid');
        if (!container) return;

        container.innerHTML = '';

        if (!lancamentos || lancamentos.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); width: 100%; text-align: center;">Nenhum lançamento nesta semana.</p>';
            return;
        }

        lancamentos.forEach(item => {
            const card = document.createElement('div');

            if (item.destaque) {
                card.className = 'release-card highlight-release';
                card.innerHTML = `
           <div class="release-info">
             <span class="tag tag-exclusive">${item.tag}</span>
             <h4>${item.nome}</h4>
             <p>${item.artista}</p>
           </div>
           <a href="${item.linkUrl}" class="btn-outline-primary">${item.linkBtn}</a>
        `;
            } else {
                card.className = 'release-card';
                card.innerHTML = `
           <img src="${item.capa}" alt="${item.nome}" class="release-cover" loading="lazy">
           <div class="release-info">
             <h4>${item.nome}</h4>
             <span>${item.artista}</span>
           </div>
           <button class="play-circle" title="Ouvir na Rádio" data-play><i class="fa-solid fa-play"></i></button>
        `;
            }

            container.appendChild(card);
        });

        // Reconectar os botões de play recém criados ao player se existirem
        if (typeof window.rebindPlayerButtons === 'function') {
            window.rebindPlayerButtons();
        }
    }
});
