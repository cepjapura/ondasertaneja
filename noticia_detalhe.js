document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const noticiaId = params.get('id');

    if (!noticiaId) {
        exibirErro();
        return;
    }

    fetch(`/api/news/${noticiaId}`)
        .then(res => {
            if (!res.ok) throw new Error('Notícia não encontrada');
            return res.json();
        })
        .then(noticia => {
            if (noticia && noticia.title) {
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
    // Definir título na aba do navegador com o título real da notícia
    const titulo = noticia.title || noticia.titulo || 'Notícia';
    document.title = `${titulo} | Onda Sertaneja`;

    // Preencher o Hero
    document.getElementById('newsTitle').innerText = titulo;
    const dataPub = noticia.publishedAt ? new Date(noticia.publishedAt).toLocaleDateString('pt-BR') : (noticia.data || '--/--/----');
    document.getElementById('newsDate').innerHTML = `<i class="fa-regular fa-calendar"></i> Publicado: ${dataPub}`;

    // Configurar a tag
    const tagEl = document.getElementById('newsTag');
    const badgeText = noticia.trustType === 'confirmed' ? '🟢 Informação Confirmada' : (noticia.trustType === 'rumor' ? '🟡 Rumor' : (noticia.tag || 'Notícia'));
    tagEl.innerText = badgeText;
    tagEl.style.backgroundColor = 'var(--primary)';
    tagEl.style.color = '#fff';

    // Imagem de Fundo do Hero
    const imagem = noticia.coverUrl || noticia.imagem;
    if (imagem) {
        const hero = document.getElementById('heroNoticia');
        hero.style.backgroundImage = `url('${imagem}')`;
        hero.style.backgroundSize = 'cover';
        hero.style.backgroundPosition = 'center';
    }

    // Preencher o Conteúdo Completo
    const articleContainer = document.getElementById('newsArticle');
    articleContainer.innerHTML = ''; // Limpar o loading

    let conteudoArray = [];
    if (typeof noticia.contentJson === 'string') {
        try {
            conteudoArray = JSON.parse(noticia.contentJson);
        } catch {
            conteudoArray = [noticia.contentJson];
        }
    } else if (Array.isArray(noticia.conteudo)) {
        conteudoArray = noticia.conteudo;
    }

    if (Array.isArray(conteudoArray) && conteudoArray.length > 0) {
        conteudoArray.forEach(paragrafo => {
            const p = document.createElement('p');
            p.innerText = paragrafo;
            articleContainer.appendChild(p);
        });
    } else {
        const p = document.createElement('p');
        p.innerText = noticia.summary || noticia.resumo || 'Conteúdo indisponível.';
        articleContainer.appendChild(p);
    }
}

function exibirErro() {
    document.getElementById('newsTitle').innerText = 'Notícia não encontrada';
    document.getElementById('newsDate').innerText = '';
    document.getElementById('newsTag').style.display = 'none';

    const articleContainer = document.getElementById('newsArticle');
    articleContainer.innerHTML = '<p style="color: var(--text-muted);">Lamentamos, mas a notícia que você procurou não existe, foi removida ou o ID é inválido. <a href="index.html" style="color: var(--primary);">Voltar à home</a>.</p>';
}
