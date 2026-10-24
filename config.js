document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/config')
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

            // Atualizar botão flutuante do WhatsApp com o link real do config
            const btnWhatsappFloat = document.getElementById('btnWhatsappFloat');
            if (btnWhatsappFloat && data.whatsappLink) {
                btnWhatsappFloat.href = data.whatsappLink;
            }

            // Expor número de WhatsApp para o contato.js usar
            window.ONDA_WHATSAPP_NUMERO = data.whatsappLink
                ? data.whatsappLink.replace('https://wa.me/', '')
                : null;

            // Substituir src do Audio Player global
            const radioPlayer = document.getElementById('radioPlayer');
            if (radioPlayer && radioPlayer.querySelector('source') && data.streamAudioUrl) {
                radioPlayer.querySelector('source').src = data.streamAudioUrl;
                radioPlayer.load(); // força recarregar a source nova
            }
        })
        .catch(error => console.error('Erro ao carregar config.json:', error));
});
