const params = new URLSearchParams(window.location.search);
const artistaNome = params.get('nome') || 'Artista Desconhecido';

document.getElementById('artistNameTop').innerText = `Ouvindo: Especial ${artistaNome}`;
document.getElementById('artistName').innerText = artistaNome;

// 1. Carregar Dados do Artista (Foto) para o Hero e Info Extra
fetch('artistas.json')
  .then(res => res.json())
  .then(data => {
    const artistaInfo = data.find(a => a.nome === artistaNome);

    if (artistaInfo && artistaInfo.imagem) {
      document.getElementById('heroArtista').style.backgroundImage = `url('${artistaInfo.imagem}')`;
      document.getElementById('heroArtista').style.backgroundSize = 'cover';
      document.getElementById('heroArtista').style.backgroundPosition = 'center 20%';
    } else {
      // Placeholder caso não tenha foto específica
      document.getElementById('heroArtista').style.backgroundImage = `url('https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')`;
      document.getElementById('heroArtista').style.backgroundSize = 'cover';
    }
  })
  .catch(err => console.error('Erro ao buscar metadados do artista', err));


// 2. Carregar Agenda Específica deste Artista
fetch('agenda.json')
  .then(res => res.json())
  .then(data => {
    // Filtrar apenas shows do artista selecionado
    const agenda = data.filter(show => show.artista === artistaNome);
    renderAgenda(agenda);
  })
  .catch(() => {
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
