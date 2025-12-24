const bedrock = require("bedrock-protocol");
const http = require("http").createServer();
const io = require("socket.io")(http, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

let mcClient = null;

io.on("connection", (socket) => {
  console.log("📱 App conectado ao Render.");

  socket.on("start-bot", (data) => {
    console.log(`🎮 Dados recebidos: ${data.username} em ${data.host}:${data.port}`);

    // Fecha conexão anterior se existir
    if (mcClient) {
      try { mcClient.close(); } catch(e) {}
    }

    try {
      // CRIAÇÃO DO CLIENTE
      mcClient = bedrock.createClient({
        host: data.host.trim(),
        port: parseInt(data.port) || 19132,
        username: data.username.trim(),
        version: data.version || "1.20.10",
        offline: true,
        skipPing: true,
        raknetBackend: 'js' // <--- IMPORTANTE: Força o motor JS
      });

      mcClient.on("spawn", () => {
        console.log("✅ Bot entrou no mundo!");
        socket.emit("status", { msg: "Bot Online no Minecraft!" });
      });

      mcClient.on("text", (packet) => {
        socket.emit("mc-message", { 
          user: packet.source_name || "Sistema", 
          text: packet.message 
        });
      });

      mcClient.on("error", (err) => {
        console.error("❌ Erro interno do Bot:", err.message);
        socket.emit("status", { msg: "Erro no Bot: " + err.message });
      });

      mcClient.on("close", () => {
        console.log("🔌 Conexão com Minecraft fechada.");
        socket.emit("status", { msg: "Bot desconectado." });
      });

    } catch (error) {
      console.error("❌ Falha crítica ao criar cliente:", error);
      socket.emit("status", { msg: "Falha ao iniciar: " + error.message });
    }
  });

  socket.on("send-chat", (msg) => {
    if (mcClient) {
      mcClient.queue("text", {
        type: "chat", needs_translation: false, source_name: mcClient.username,
        xuid: "", platform_chat_id: "", filtered_message: "", message: msg
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});