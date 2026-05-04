document.addEventListener('DOMContentLoaded', () => {
    fetch('galeria.json')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('galeriaMasonry');
            if (!container) return;

            container.innerHTML = ''; // Limpar o placeholder

            data.forEach(item => {
                const galleryItem = document.createElement('div');
                // Se houver classe de tamanho (large, wide), aplica, senão só gallery-item
                galleryItem.className = `gallery-item ${item.classeTamanho || ''}`.trim();
                galleryItem.style.backgroundImage = `url('${item.imagem}')`;

                const caption = document.createElement('div');
                caption.className = 'gallery-caption';
                caption.innerText = item.legenda;

                galleryItem.appendChild(caption);
                container.appendChild(galleryItem);
            });
        })
        .catch(error => console.error('Erro ao carregar galeria.json:', error));
});
