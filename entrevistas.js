document.addEventListener('DOMContentLoaded', () => {
    fetch('entrevistas.json')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('entrevistaBanner');
            if (!container) return;

            // Configura a imagem de fundo
            container.style.backgroundImage = `url('${data.imagemFundo}')`;

            // Popula os dados
            container.innerHTML = `
                <div class="interview-overlay"></div>
                <div class="interview-content">
                  <span class="tag tag-exclusive">${data.tag}</span>
                  <h2>${data.titulo}</h2>
                  <p>${data.resumo}</p>
                  <a href="${data.link}" target="_blank" style="text-decoration: none;">
                    <button class="btn-primary">${data.textoBotao}</button>
                  </a>
                </div>
            `;
        })
        .catch(error => console.error('Erro ao carregar entrevistas.json:', error));
});
