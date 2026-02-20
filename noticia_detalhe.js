document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const noticiaId = params.get('id');

    if (!noticiaId) {
        exibirErro();
        return;
    }

    fetch('noticias.json')
        .then(res => res.json())
        .then(data => {
            const noticia = data.find(n => n.id === noticiaId);

            if (noticia) {
                renderizarNoticia(noticia);
            } else {
                exibirErro();
            }
        })
        .catch(err => {
            console.error('Erro ao carregar notícia', err);
            exibirErro();
        });
});

function renderizarNoticia(noticia) {
    // Definir título na aba
    document.title = `${noticia.titulo} | Onda Sertaneja`;

    // Preencher o Hero
    document.getElementById('newsTitle').innerText = noticia.titulo;
    document.getElementById('newsDate').innerHTML = `<i class="fa-regular fa-calendar"></i> Publicado: ${noticia.data}`;

    // Configurar a tag
    const tagEl = document.getElementById('newsTag');
    tagEl.innerText = noticia.tag;

    // Usar as mesmas cores das classes originais
    if (noticia.classeTag === 'tag-hot') { tagEl.style.backgroundColor = 'var(--primary)'; tagEl.style.color = 'var(--text-light)'; }
    else if (noticia.classeTag === 'tag-release') { tagEl.style.backgroundColor = '#1DB954'; tagEl.style.color = '#fff'; }
    else { tagEl.style.backgroundColor = 'var(--surface)'; tagEl.style.color = 'var(--text-light)'; }

    // Imagem de Fundo do Hero
    if (noticia.imagem) {
        const hero = document.getElementById('heroNoticia');
        hero.style.backgroundImage = `url('${noticia.imagem}')`;
        hero.style.backgroundSize = 'cover';
        hero.style.backgroundPosition = 'center';
    }

    // Preencher o Conteúdo Completo
    const articleContainer = document.getElementById('newsArticle');
    articleContainer.innerHTML = ''; // Limpar o loading

    // Tratar o "conteudo" como um array de parágrafos
    if (noticia.conteudo && Array.isArray(noticia.conteudo)) {
        noticia.conteudo.forEach(paragrafo => {
            const p = document.createElement('p');
            p.innerText = paragrafo;
            p.style.color = 'var(--text-light)';
            p.style.lineHeight = '1.8';
            p.style.marginBottom = '20px';
            p.style.fontSize = '1.1rem';
            articleContainer.appendChild(p);
        });
    } else {
        // Fallback pro resumo caso a notícia seja muito antiga e não tenha texto longo
        const p = document.createElement('p');
        p.innerText = noticia.resumo || 'Conteúdo indisponível.';
        articleContainer.appendChild(p);
    }
}

function exibirErro() {
    document.getElementById('newsTitle').innerText = "Notícia não encontrada";
    document.getElementById('newsDate').innerText = "";
    document.getElementById('newsTag').style.display = 'none';

    const articleContainer = document.getElementById('newsArticle');
    articleContainer.innerHTML = '<p style="color: var(--text-muted);">Lamentamos, mas a notícia que você procurou não existe, foi removida ou o ID é inválido. <a href="index.html" style="color: var(--primary);">Voltar à home</a>.</p>';
}
