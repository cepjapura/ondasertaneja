document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/news?category=interview')
        .then(response => response.json())
        .then(dataList => {
            const container = document.getElementById('entrevistaBanner');
            if (!container) return;

            const data = Array.isArray(dataList) && dataList.length > 0 ? {
                tag: 'Exclusiva',
                titulo: dataList[0].title,
                resumo: dataList[0].summary,
                imagemFundo: dataList[0].coverUrl,
                link: `noticia.html?id=${dataList[0].slug}`,
                textoBotao: 'Ler Entrevista Completa'
            } : null;

            if (!data) return;

            // Configura a imagem de fundo
            container.style.backgroundImage = `url('${data.imagemFundo}')`;

            // Popula os dados
            container.innerHTML = `
                <div class="interview-overlay"></div>
                <div class="interview-content">
                  <span class="tag tag-exclusive">${data.tag}</span>
                  <h2>${data.titulo}</h2>
                  <p>${data.resumo}</p>
                  <a href="${data.link}" style="text-decoration: none;">
                    <button class="btn-primary">${data.textoBotao}</button>
                  </a>
                </div>
            `;
        })
        .catch(error => console.error('Erro ao carregar entrevistas:', error));
});
