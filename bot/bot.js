require('dotenv').config();
const { TOKEN } = process.env;
const { Telegraf } = require("telegraf");
const bot = new Telegraf(TOKEN);
const web_link = "https://tel1.c4ei.net/";

bot.start((ctx) =>
  ctx.reply("Welcome AAH mining :)))))", {
    reply_markup: {
      keyboard: [[{ text: "web app", web_app: { url: web_link } }]],
    },
  })
);

bot.launch();
