const player = document.getElementById('radioPlayer');

// Variável para manter os botões de play/pause trackeados
let playButtons = document.querySelectorAll('[data-play]');
let isPlaying = false;

// Função chamada inicial e a cada recarregamento dinâmico (no lancamentos.js)
function rebindPlayerButtons() {
  // Limpar listeners antigos clonando o botão se necessário (opcional) ou apenas refazendo o query
  // Mas de forma mais simples, apenas atribuimos novo query e removemos/adicionamos event listener
  playButtons = document.querySelectorAll('[data-play]');

  playButtons.forEach(button => {
    // Remover o evento antigo caso já exista (usar clone resolve isso facilmente)
    const clone = button.cloneNode(true);
    button.parentNode.replaceChild(clone, button);

    clone.addEventListener('click', (e) => {
      e.preventDefault(); // Prevenir rolagem se for ancora
      if (!isPlaying) {
        player.play().then(() => {
          isPlaying = true;
          updateButtons(true);
        }).catch(err => {
          console.log('Erro de autoplay:', err);
          alert('Seu navegador bloqueou o áudio. Tente clicar novamente!');
        });
      } else {
        player.pause();
        isPlaying = false;
        updateButtons(false);
      }
    });
  });
}

// Atualizar interface de todos os botões de rádio
function updateButtons(playingInfo) {
  playButtons = document.querySelectorAll('[data-play]'); // Pegar botões novos também
  playButtons.forEach(btn => {
    // Se for o botão principal gigante da Hero ou Navbar, ele tem texto
    if (btn.classList.contains('btn-play-hero') || btn.classList.contains('player-btn')) {
      if (playingInfo) {
        btn.innerHTML = '<i class="fa-solid fa-pause"></i> Pausar Rádio';
      } else {
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Ouvir a Rádio';
      }
    } else {
      // Se for os botões bolinhas dos lançamentos
      if (playingInfo) {
        btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        btn.classList.add('playing');
      } else {
        btn.innerHTML = '<i class="fa-solid fa-play"></i>';
        btn.classList.remove('playing');
      }
    }
  });
}

// Expôr pra janela global para que o fetch.json possa chamar
window.rebindPlayerButtons = rebindPlayerButtons;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  rebindPlayerButtons();
});
