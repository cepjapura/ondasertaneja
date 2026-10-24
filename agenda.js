// AGENDA DE SHOWS SCRIPT

document.addEventListener('DOMContentLoaded', () => {
  fetch('/api/events')
    .then(response => {
      if (!response.ok) throw new Error('Erro ao carregar a agenda');
      return response.json();
    })
    .then(data => {
      // Normalizar resposta da API (trata datas ISO string ou DD/MM/YYYY)
      const mappedShows = (Array.isArray(data) ? data : (data.cascade?.local || [])).map(item => ({
        artista: item.title || item.artista || (item.artists?.[0]?.artist?.name) || 'Show Sertanejo',
        data: item.eventDate ? new Date(item.eventDate).toLocaleDateString('pt-BR') : item.data,
        cidade: item.city ? `${item.city.name} - ${item.city.stateCode}` : (item.cidade || ''),
        local: item.venue?.name || item.local || 'Local a confirmar',
        destaque: item.isHighlight || item.destaque || false,
      }));
      renderAgenda(mappedShows);
    })
    .catch(err => {
      console.error(err);
      document.getElementById('agendaShows').innerHTML =
        '<div class="agenda-item"><p style="color: var(--text-muted);">Não foi possível carregar a agenda no momento.</p></div>';
    });
});

function parseDataShow(dataStr) {
  // Converte "DD/MM/YYYY" para um objeto Date
  const partes = dataStr.split('/');
  if (partes.length !== 3) return null;
  // new Date(year, monthIndex, day) — month é 0-indexed
  return new Date(parseInt(partes[2], 10), parseInt(partes[1], 10) - 1, parseInt(partes[0], 10));
}

function renderAgenda(shows) {
  const container = document.getElementById('agendaShows');

  // Limpar os skeletons (placeholders)
  container.innerHTML = '';

  if (!shows || shows.length === 0) {
    container.innerHTML = '<div class="agenda-item"><p style="color: var(--text-muted);">Nenhum show cadastrado.</p></div>';
    return;
  }

  // Filtrar apenas shows futuros (a partir de hoje, inclusive)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); // Zerar horário para comparar apenas a data

  const showsFuturos = shows.filter(show => {
    const dataShow = parseDataShow(show.data);
    return dataShow && dataShow >= hoje;
  });

  if (showsFuturos.length === 0) {
    container.innerHTML = '<div class="agenda-item"><p style="color: var(--text-muted);">Nenhum show próximo na agenda. Fique ligado!</p></div>';
    return;
  }

  // Ordenar por data crescente
  showsFuturos.sort((a, b) => parseDataShow(a.data) - parseDataShow(b.data));

  const mesesAbrev = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  showsFuturos.forEach(show => {
    // Quebrar a data "DD/MM/YYYY" para pegar dia e mês
    const partesData = show.data.split('/');
    const dia = partesData[0] || '--';
    const mesNum = partesData[1] || '00';

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
         <button class="btn-outline-primary" style="padding: 8px 16px; font-size: 0.85rem;">Ingressos</button>
      </div>
    `;

    container.appendChild(card);
  });
}
