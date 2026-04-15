const ffmpeg = require('ffmpeg-static');
process.env.FFMPEG_PATH = ffmpeg;

const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is alive!");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Web server đang chạy");
});
const { Client, GatewayIntentBits } = require('discord.js');
const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus,
  getVoiceConnection
} = require('@discordjs/voice');

const gTTS = require('gtts');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ❗ DÁN TOKEN MỚI (đã reset) vào đây
const TOKEN = process.env.TOKEN;
const timeouts = new Map();

function resetTimer(guildId) {
  if (timeouts.has(guildId)) {
    clearTimeout(timeouts.get(guildId));
  }

  const newTimeout = setTimeout(() => {
    const conn = getVoiceConnection(guildId);
    if (conn) {
      conn.destroy();
      console.log("Bot đã tự thoát sau 5 phút");
    }
  }, 300000);

  timeouts.set(guildId, newTimeout);
}

const DEFAULT_LANG = "vi";

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (
    message.content.startsWith("m!play") ||
    message.content.startsWith("m!stop") ||
    message.content.startsWith("dcm")
  ) return;

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return;

  console.log("Nhận tin:", message.content);

  // 🔥 Luôn destroy connection cũ để tránh bug
  let connection = getVoiceConnection(message.guild.id);
  if (connection) {
    try {
      connection.destroy();
    } catch {}
  }

  // 👉 Join mới hoàn toàn
  connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });

  const text = message.content;
  const file = `/tmp/tts-${Date.now()}.mp3`;

  const tts = new gTTS(text, DEFAULT_LANG);

  tts.save(file, (err) => {
  if (err) {
    console.error("Lỗi TTS:", err);
    return;
  }

  const player = createAudioPlayer();
  const resource = createAudioResource(file, {
    inputType: 'arbitrary',
  });

  connection.subscribe(player);

  setTimeout(() => {
    player.play(resource);
  }, 500);

  player.on(AudioPlayerStatus.Idle, () => {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });
});

  resetTimer(message.guild.id);
});

client.once('clientReady', () => {
  console.log("Bot đã online!");
});

console.log("ENV TOKEN:", process.env.TOKEN);

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

client.login(TOKEN);
