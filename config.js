document.addEventListener('DOMContentLoaded', () => {
    fetch('config.json')
        .then(response => response.json())
        .then(data => {
            // Aplicar links de Redes Sociais no Footer
            const instagramLnk = document.getElementById('lnkInstagram');
            if (instagramLnk) instagramLnk.href = data.instagram;

            const tiktokLnk = document.getElementById('lnkTiktok');
            if (tiktokLnk) tiktokLnk.href = data.tiktok;

            const youtubeLnk = document.getElementById('lnkYoutube');
            if (youtubeLnk) youtubeLnk.href = data.youtube;

            // Aplicar no Contato
            const contatoWhatsappTxt = document.getElementById('txtContatoWhatsapp');
            if (contatoWhatsappTxt) contatoWhatsappTxt.innerText = data.whatsapp;

            const contatoEmailTxt = document.getElementById('txtContatoEmail');
            if (contatoEmailTxt) contatoEmailTxt.innerText = data.email;

            // Substituir src do Audio Player global
            const radioPlayer = document.getElementById('radioPlayer');
            if (radioPlayer && radioPlayer.querySelector('source')) {
                // Seta o source mas nao da autoplay pra nao quebrar a regra do browser
                radioPlayer.querySelector('source').src = data.streamAudioUrl;
                radioPlayer.load(); // forca recarregar a source nova
            }
        })
        .catch(error => console.error('Erro ao carregar config.json:', error));
});
