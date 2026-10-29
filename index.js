
const mineflayer = require("mineflayer");

const HOST = process.env.MC_HOST || "bur-oak-smp.falixsrv.me";
const PORT = Number(process.env.MC_PORT || 25565);
const USERNAME = process.env.MC_USERNAME;
const AUTH = process.env.MC_AUTH || "offline";

if (!USERNAME) {
  console.error("Missing MC_USERNAME environment variable.");
  process.exit(1);
}

let bot;
let reconnectTimer;
let stopped = false;
let reconnectDelay = 15000;

function connect() {
  if (stopped) return;

  console.log(`Connecting to ${HOST}:${PORT}`);

  bot = mineflayer.createBot({
    host: HOST,
    port: PORT,
    username: USERNAME,
    auth: AUTH,
    hideErrors: false
  });

  bot.once("login", () => {
    console.log("Minecraft login successful.");
  });

  bot.once("spawn", () => {
    console.log("Bot spawned in the world.");
    reconnectDelay = 15000;

    // Gentle movement every 60 seconds.
    const movementTimer = setInterval(() => {
      if (stopped || !bot || !bot.entity) {
        clearInterval(movementTimer);
        return;
      }

      // Release previous controls before starting a new action.
      bot.clearControlStates();

      // Briefly walk forward, then stop.
      bot.setControlState("forward", true);

      setTimeout(() => {
        if (bot && bot.entity) {
          bot.clearControlStates();
        }
      }, 700);
    }, 60000);

    bot.once("end", () => clearInterval(movementTimer));
  });

  bot.on("kicked", (reason) => {
    console.log("Kicked by server:", reason);
  });

  bot.on("error", (err) => {
    console.error("Minecraft error:", err.message);
  });

  bot.once("end", () => {
    console.log("Connection ended.");

    if (stopped) return;

    console.log(`Retrying in ${reconnectDelay / 1000}s.`);

    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 120000);
  });
}

function shutdown() {
  stopped = true;
  clearTimeout(reconnectTimer);

  if (bot) {
    bot.clearControlStates();
    bot.quit("Worker shutting down");
  }

  setTimeout(() => process.exit(0), 1000);
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);

connect();
