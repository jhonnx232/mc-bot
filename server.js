const bedrock = require("bedrock-protocol");
const http = require("http").createServer();
const io = require("socket.io")(http, { cors: { origin: "*" } });

io.on("connection", (socket) => {
    socket.on("start-bot", (data) => {
        try {
            mcClient = bedrock.createClient({
                host: data.host,
                port: parseInt(data.port),
                username: data.username,
                version: data.version,
                offline: true,
                raknetBackend: 'js' // <--- A chave é essa linha
            });

            mcClient.on('error', (err) => console.log("Erro no bot:", err));
            mcClient.on('spawn', () => socket.emit("status", { msg: "Bot Online!" }));
        } catch (e) {
            socket.emit("status", { msg: "Erro: " + e.message });
        }
    });
});

http.listen(process.env.PORT || 3000);