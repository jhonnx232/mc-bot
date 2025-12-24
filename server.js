const bedrock = require('bedrock-protocol');
const http = require('http').createServer();
const io = require('socket.io')(http, {
    cors: {
        origin: "*", // Permite que o app Cordova se conecte de qualquer IP
        methods: ["GET", "POST"]
    }
});

let mcClient = null;

io.on('connection', (socket) => {
    console.log('📱 App conectado ao servidor de controle.');

    // Evento disparado quando você clica em "Conectar" no Celular
    socket.on('start-bot', (data) => {
        console.log(`🎮 Tentando conectar bot: ${data.username} em ${data.host}:${data.port} (v${data.version})`);

        // Se já houver um bot rodando para este socket, desconecta antes de iniciar outro
        if (mcClient) {
            mcClient.close();
        }

        try {
            mcClient = bedrock.createClient({
                host: data.host,
                port: parseInt(data.port),
                username: data.username,
                version: data.version, // Versão vinda do seletor do App
                offline: true,
                skipPing: true
            });

            // Quando o bot entra no mundo
            mcClient.on('spawn', () => {
                console.log('✅ Bot spawnou no servidor!');
                socket.emit('status', { msg: 'Bot Online e Spawnado!' });
            });

            // Quando o bot recebe mensagens de chat do Minecraft
            mcClient.on('text', (packet) => {
                console.log(`💬 Chat: ${packet.source_name}: ${packet.message}`);
                
                // Repassa a mensagem para o Celular exibir na tela
                socket.emit('mc-message', {
                    user: packet.source_name,
                    text: packet.message,
                    type: packet.type
                });
            });

            // Quando novos jogadores entram (sua lógica original)
            mcClient.on('add_player', (packet) => {
                mcClient.queue('text', {
                    type: 'chat',
                    needs_translation: false,
                    source_name: mcClient.username,
                    xuid: '',
                    platform_chat_id: '',
                    filtered_message: '',
                    message: `Hey, ${packet.username} just joined!`
                });
            });

            // Tratamento de erros de conexão
            mcClient.on('error', (err) => {
                console.error('❌ Erro no Bot:', err);
                socket.emit('status', { msg: 'Erro na conexão com o Minecraft' });
            });

        } catch (error) {
            console.error('❌ Erro ao criar cliente:', error);
            socket.emit('status', { msg: 'Falha crítica ao iniciar bot' });
        }
    });

    // Evento disparado quando você digita no chat do App e envia
    socket.on('send-chat', (msg) => {
        if (mcClient) {
            mcClient.queue('text', {
                type: 'chat',
                needs_translation: false,
                source_name: mcClient.username,
                xuid: '',
                platform_chat_id: '',
                filtered_message: '',
                message: msg
            });
            console.log(`📤 Enviando para o jogo: ${msg}`);
        } else {
            socket.emit('status', { msg: 'Bot não está conectado!' });
        }
    });

    // Desconecta o bot se o app fechar a conexão socket
    socket.on('disconnect', () => {
        console.log('🛑 App desconectado. O bot continuará rodando se configurado.');
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor de Controle rodando em http://localhost:${PORT}`);
    console.log(`DICA: No Cordova, use o IP da sua rede (ex: 192.168.x.x) para conectar.`);
});