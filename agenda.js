// AGENDA DE SHOWS SCRIPT

document.addEventListener('DOMContentLoaded', () => {
  fetch('agenda.json')
    .then(response => {
      if (!response.ok) throw new Error('Erro ao carregar a agenda');
      return response.json();
    })
    .then(data => renderAgenda(data))
    .catch(err => {
      console.error(err);
      document.getElementById('agendaShows').innerHTML =
        '<div class="agenda-item"><p style="color: var(--text-muted);">Não foi possível carregar a agenda no momento.</p></div>';
    });
});

function renderAgenda(shows) {
  const container = document.getElementById('agendaShows');
  
  // Limpar os skeletons (placeholders)
  container.innerHTML = '';

  if (!shows || shows.length === 0) {
    container.innerHTML = '<div class="agenda-item"><p style="color: var(--text-muted);">Nenhum show cadastrado.</p></div>';
    return;
  }

  shows.forEach(show => {
    // Quebrar a data "DD/MM/YYYY" para pegar dia e mês
    const partesData = show.data.split('/');
    const dia = partesData[0] || '--';
    const mesNum = partesData[1] || '00';
    
    const mesesAbrev = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const mesStr = mesesAbrev[parseInt(mesNum, 10) - 1] || 'MÊS';

    const card = document.createElement('div');
    card.className = 'agenda-item';
    if (show.destaque) {
      card.style.borderColor = 'var(--primary)';
    }

    card.innerHTML = `
      <div class="agenda-date-box">
        <span class="agd-day">${dia}</span>
        <span class="agd-month">${mesStr}</span>
      </div>
      <div class="agenda-info">
        <h4>${show.artista}</h4>
        <p><i class="fa-solid fa-location-dot"></i> ${show.local} • ${show.cidade}</p>
      </div>
      <div class="agenda-action">
         <!-- Botão vazio por enquanto, poderia ser Comprar, Ver Mais etc -->
         <button class="btn-outline-primary" style="padding: 8px 16px; font-size: 0.85rem;">Ingressos</button>
      </div>
    `;

    container.appendChild(card);
  });
}
