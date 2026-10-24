document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/config')
        .then(response => response.json())
        .then(configData => {
            const container = document.getElementById('galeriaMasonry');
            if (!container) return;

            let data = [];
            if (configData.galleryPhotos) {
                try {
                    data = JSON.parse(configData.galleryPhotos);
                } catch {
                    data = [];
                }
            }

            if (!data || data.length === 0) return;

            container.innerHTML = ''; // Limpar o placeholder

            data.forEach(item => {
                const galleryItem = document.createElement('div');
                galleryItem.className = `gallery-item ${item.classeTamanho || ''}`.trim();
                galleryItem.style.backgroundImage = `url('${item.imagem}')`;

                const caption = document.createElement('div');
                caption.className = 'gallery-caption';
                caption.innerText = item.legenda;

                galleryItem.appendChild(caption);
                container.appendChild(galleryItem);
            });
        })
        .catch(error => console.error('Erro ao carregar galeria da API:', error));
});
