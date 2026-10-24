const params = new URLSearchParams(window.location.search);
const artistaNome = params.get('nome') || 'Artista Desconhecido';

document.getElementById('artistNameTop').innerText = `Ouvindo: Especial ${artistaNome}`;
document.getElementById('artistName').innerText = artistaNome;

// Carregar dados completos do artista a partir da API
fetch(`/api/artists/${encodeURIComponent(artistaNome)}`)
  .then(res => res.json())
  .then(artistData => {
    if (artistData && !artistData.error) {
      document.getElementById('artistNameTop').innerText = `Ouvindo: Especial ${artistData.name}`;
      document.getElementById('artistName').innerText = artistData.name;

      if (artistData.coverUrl || artistData.avatarUrl) {
        document.getElementById('heroArtista').style.backgroundImage = `url('${artistData.coverUrl || artistData.avatarUrl}')`;
        document.getElementById('heroArtista').style.backgroundSize = 'cover';
        document.getElementById('heroArtista').style.backgroundPosition = 'center 20%';
      }

      // Mapear shows vindos do relacionamento da API
      const eventsList = (artistData.events || []).map(e => ({
        cidade: e.event?.city ? `${e.event.city.name} - ${e.event.city.stateCode}` : (e.event?.title || ''),
        local: e.event?.venue?.name || 'Local a confirmar',
        data: e.event?.eventDate ? new Date(e.event.eventDate).toLocaleDateString('pt-BR') : '',
      }));
      renderAgenda(eventsList);
    } else {
      document.getElementById('agendaArtista').innerHTML =
        '<div class="agenda-item"><p style="color: var(--text-muted);">Artista não encontrado.</p></div>';
    }
  })
  .catch(err => {
    console.error('Erro ao buscar artista:', err);
    document.getElementById('agendaArtista').innerHTML =
      '<div class="agenda-item"><p style="color: var(--text-muted);">Erro ao carregar agenda.</p></div>';
  });

function renderAgenda(shows) {
  const container = document.getElementById('agendaArtista');
  container.innerHTML = '';

  if (shows.length === 0) {
    container.innerHTML = '<div class="agenda-item"><p style="color: var(--text-muted);">Nenhum show cadastrado para este artista.</p></div>';
    return;
  }

  shows.forEach(show => {
    // Quebrar data para o layout do calendário (DD / MM) igual da Home
    const partesData = show.data.split('/');
    const dia = partesData[0] || '--';
    const mesNum = partesData[1] || '00';
    const mesesAbrev = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    const mesStr = mesesAbrev[parseInt(mesNum, 10) - 1] || 'MÊS';

    const card = document.createElement('div');
    card.className = 'agenda-item';

    card.innerHTML = `
      <div class="agenda-date-box">
        <span class="agd-day">${dia}</span>
        <span class="agd-month">${mesStr}</span>
      </div>
      <div class="agenda-info">
        <h4><i class="fa-solid fa-location-dot" style="color: var(--primary);"></i> ${show.cidade}</h4>
        <p style="color: var(--text-muted);">${show.local}</p>
      </div>
      <div class="agenda-action">
         <button class="btn-outline-primary" style="padding: 8px 16px; font-size: 0.85rem;">Ingressos</button>
      </div>
    `;

    container.appendChild(card);
  });
}
