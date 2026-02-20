document.addEventListener('DOMContentLoaded', () => {
    const formContato = document.getElementById('formContato');

    if (formContato) {
        formContato.addEventListener('submit', (e) => {
            e.preventDefault();

            const nome = document.getElementById('nome').value || '';
            const email = document.getElementById('email').value || '';
            const telefone = document.getElementById('telefone').value || '';
            const mensagem = document.getElementById('mensagem').value || '';

            if (!nome || !mensagem) {
                alert('Por favor, preencha pelo menos seu Nome e a Mensagem!');
                return;
            }

            // Número fictício do WhatsApp da rádio - Substitua depois
            const numeroWhatsApp = '5511999999999';

            let texto = `*Contato via Site - Onda Sertaneja*%0A%0A`;
            texto += `*Nome:* ${nome}%0A`;
            if (email) texto += `*E-mail:* ${email}%0A`;
            if (telefone) texto += `*WahtsApp:* ${telefone}%0A%0A`;
            texto += `*Mensagem:*%0A${mensagem}`;

            const url = `https://wa.me/${numeroWhatsApp}?text=${texto}`;

            window.open(url, '_blank');

            // Limpa os campos após enviar
            formContato.reset();
        });
    }
});
