document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('globalSearchInput');
  const searchDropdown = document.getElementById('globalSearchDropdown');

  if (!searchInput || !searchDropdown) return;

  let debounceTimer = null;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    clearTimeout(debounceTimer);

    if (query.length < 2) {
      searchDropdown.style.display = 'none';
      searchDropdown.innerHTML = '';
      return;
    }

    debounceTimer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(data => renderSearchDropdown(data))
        .catch(err => console.error('Erro na busca preditiva:', err));
    }, 200);
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
      searchDropdown.style.display = 'none';
    }
  });

  function renderSearchDropdown(data) {
    searchDropdown.innerHTML = '';

    const hasResults =
      (data.artists && data.artists.length > 0) ||
      (data.events && data.events.length > 0) ||
      (data.news && data.news.length > 0) ||
      (data.cities && data.cities.length > 0);

    if (!hasResults) {
      searchDropdown.innerHTML = `
        <div style="padding: 15px; text-align: center; color: var(--text-muted); font-size: 0.9rem;">
          Nenhum resultado encontrado para "${data.query}".
        </div>
      `;
      searchDropdown.style.display = 'block';
      return;
    }

    let html = '';

    // 1. Artistas
    if (data.artists && data.artists.length > 0) {
      html += `<div class="search-category-title">👤 Artistas</div>`;
      data.artists.forEach(artist => {
        html += `
          <a href="artista.html?nome=${artist.slug}" class="search-result-item">
            <img src="${artist.avatarUrl || 'img/sponsors/mioto.png'}" class="search-item-img" alt="${artist.name}">
            <div>
              <div class="search-item-title">${artist.name}</div>
              <span class="search-item-sub">Perfil do Artista</span>
            </div>
          </a>
        `;
      });
    }

    // 2. Events / Shows
    if (data.events && data.events.length > 0) {
      html += `<div class="search-category-title">📅 Shows & Eventos</div>`;
      data.events.forEach(ev => {
        const cityStr = ev.city ? `${ev.city.name} - ${ev.city.stateCode}` : '';
        html += `
          <a href="index.html#agenda" class="search-result-item">
            <div class="search-item-icon"><i class="fa-solid fa-calendar-days"></i></div>
            <div>
              <div class="search-item-title">${ev.title}</div>
              <span class="search-item-sub">${cityStr} • ${new Date(ev.eventDate).toLocaleDateString('pt-BR')}</span>
            </div>
          </a>
        `;
      });
    }

    // 3. Cidades
    if (data.cities && data.cities.length > 0) {
      html += `<div class="search-category-title">📍 Cidades</div>`;
      data.cities.forEach(city => {
        html += `
          <a href="index.html#agenda" class="search-result-item">
            <div class="search-item-icon"><i class="fa-solid fa-location-dot"></i></div>
            <div>
              <div class="search-item-title">${city.name} - ${city.stateCode}</div>
              <span class="search-item-sub">Ver agenda da região</span>
            </div>
          </a>
        `;
      });
    }

    // 4. Notícias
    if (data.news && data.news.length > 0) {
      html += `<div class="search-category-title">📰 Notícias</div>`;
      data.news.forEach(item => {
        html += `
          <a href="noticia.html?id=${item.slug}" class="search-result-item">
            <div class="search-item-icon"><i class="fa-regular fa-newspaper"></i></div>
            <div>
              <div class="search-item-title">${item.title}</div>
              <span class="search-item-sub">${new Date(item.publishedAt).toLocaleDateString('pt-BR')}</span>
            </div>
          </a>
        `;
      });
    }

    searchDropdown.innerHTML = html;
    searchDropdown.style.display = 'block';
  }
});
