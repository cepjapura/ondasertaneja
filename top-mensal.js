document.addEventListener('DOMContentLoaded', () => {
  fetch('top-mensal.json')
    .then(res => {
      if (!res.ok) throw new Error('Erro ao carregar JSON TOP MENSAL');
      return res.json();
    })
    .then(data => {
      const container = document.getElementById('topMensal');
      if (!container) return;

      container.innerHTML = '';

      if (!data || data.length === 0) {
        container.innerHTML = '<li class="ranking-item">Sem ranking no momento.</li>';
        return;
      }

      data.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'ranking-item';

        // Posição no ranking (1, 2, 3...)
        const pos = index + 1;

        li.innerHTML = `
          <span class="rank-num">${pos}</span>
          <div class="rank-info">
            <strong>${item.musica || 'Desconhecida'}</strong>
            <span>${item.artista || 'Desconhecido'}</span>
          </div>
        `;

        container.appendChild(li);
      });
    })
    .catch(err => {
      console.error('Erro no Top Mensal:', err);
      const container = document.getElementById('topMensal');
      if (container) {
        container.innerHTML =
          '<li class="ranking-item" style="color: var(--text-muted);">Erro ao carregar ranking.</li>';
      }
    });
});
