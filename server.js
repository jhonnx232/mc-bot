// --- ESCUDO ANTI-ERRO DE BINDINGS (DEVE SER A PRIMEIRA COISA NO ARQUIVO) ---
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (name) {
  if (name === 'raknet-native') {
    // Retorna um objeto fake para não disparar o erro de arquivo ausente
    return { Client: function() { return {}; }, Server: function() { return {}; } };
  }
  return originalRequire.apply(this, arguments);
};
// --------------------------------------------------------------------------

const bedrock = require("bedrock-protocol");
const http = require("http").createServer();
const io = require("socket.io")(http, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

let mcClient = null;

io.on("connection", (socket) => {
  console.log("📱 App conectado.");

  socket.on("start-bot", (data) => {
    if (mcClient) { try { mcClient.close(); } catch(e){} }

    try {
      mcClient = bedrock.createClient({
        host: data.host.trim(),
        port: parseInt(data.port),
        username: data.username.trim(),
        version: data.version,
        offline: true,
        skipPing: true,
        raknetBackend: 'js' // <--- USA O MOTOR JS INTERNO DO PROTOCOLO
      });

      mcClient.on("spawn", () => {
        socket.emit("status", { msg: "Bot Online!" });
      });

      mcClient.on("text", (packet) => {
        socket.emit("mc-message", { user: packet.source_name, text: packet.message });
      });

      mcClient.on("error", (err) => {
        console.error("❌ Erro no Bot:", err);
        socket.emit("status", { msg: "Erro: " + err.message });
      });

    } catch (error) {
      socket.emit("status", { msg: "Falha ao criar cliente JS" });
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

http.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log(`🚀 Servidor pronto na porta ${process.env.PORT || 3000}`);
});