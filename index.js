require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: false });

const GROUP_ID = '-1002360240004';
let userData = {};

const URL = process.env.WEBHOOK_URL || 'https://SIZNING_DOMAIN.com';
bot.setWebHook(`${URL}/bot${token}`);

app.use(bodyParser.json());
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// ---------------- COMMON KEYBOARD ----------------
const commonKeyboard = [
    ["🏠 Bosh sahifa"],
    ["🚖 Haydovchi", "🧍 Yo‘lovchi"]
];

// ---------------- BOT HANDLERLARI ----------------
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    userData[chatId] = {};
    bot.sendMessage(chatId, "Assalomu alaykum! Kim sifatida davom etasiz?", {
        reply_markup: { keyboard: commonKeyboard, resize_keyboard: true, one_time_keyboard: true }
    });
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // =================== BOSH SAHIFA ===================
    if (text === "🏠 Bosh sahifa") {
        userData[chatId] = {};
        bot.sendMessage(chatId, "Bosh sahifa:", {
            reply_markup: { keyboard: commonKeyboard, resize_keyboard: true }
        });
        return;
    }

    // =================== HAYDOVCHI ===================
    if (text === "🚖 Haydovchi") {
        bot.sendMessage(chatId, "Agar siz haydovchi sifatida qo'shilmoqchi bo'lsangiz @frontend_soft ga yoki +998900678097 ga murojaat qiling.", {
            reply_markup: { keyboard: commonKeyboard, resize_keyboard: true }
        });
        return;
    }

    // =================== YO'LOVCHI ===================
    if (text === "🧍 Yo‘lovchi") {
        bot.sendMessage(chatId, "Taksi chaqirish uchun ariza berish.\nIsmingiz va raqamingizni kiriting.\nMasalan: Ali +998xx xxx xx xx", {
            reply_markup: { keyboard: commonKeyboard, resize_keyboard: true }
        });
        userData[chatId] = { step: "name_phone" };
        return;
    }

    // =================== ISM VA TELEFON ===================
    if (userData[chatId]?.step === "name_phone") {
        userData[chatId].namePhone = text;
        userData[chatId].step = "route";

        bot.sendMessage(chatId, "Yo‘nalishingizni tanlang:", {
            reply_markup: {
                keyboard: [
                    ["Samarqand → Toshkent", "Toshkent → Samarqand"],
                    ...commonKeyboard
                ],
                resize_keyboard: true
            }
        });
        return;
    }

    // =================== YO'NALISH ===================
    if (userData[chatId]?.step === "route") {
        userData[chatId].route = text;
        userData[chatId].step = "passengers";

        bot.sendMessage(chatId, "Nechta yo‘lovchi yoki pochta:", {
            reply_markup: {
                keyboard: [
                    ["Pochta bor", "1 kishi", "2 kishi"],
                    ["3 kishi", "4 kishi", "Boshqa"],
                    ...commonKeyboard
                ],
                resize_keyboard: true
            }
        });
        return;
    }

    // =================== YO'LOVCHI SONI / POCHTA ===================
    if (userData[chatId]?.step === "passengers") {
        userData[chatId].passengers = text;
        userData[chatId].step = "location";

        bot.sendMessage(chatId, "Iltimos, hozirgi joylashuvingizni ulashing:", {
            reply_markup: {
                keyboard: [[{ text: "Joylashuvni yuborish", request_location: true }], ...commonKeyboard],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
        return;
    }

    // =================== LOCATION QABUL QILINISHI ===================
    if (userData[chatId]?.step === "location" && msg.location) {
        const { latitude, longitude } = msg.location;
        userData[chatId].locationLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        userData[chatId].step = "confirm";

        bot.sendMessage(chatId,
`🤵 Yo‘lovchi\n` +
`1⃣ Ism va telefon: ${userData[chatId].namePhone}\n` +
`2⃣ Telegram: ${msg.from.username ? `@${msg.from.username}` : " "}\n` +
`3⃣ Yo‘nalish: ${userData[chatId].route}\n` +
`4⃣ Yo‘lovchi / Pochta: ${userData[chatId].passengers}\n` +
`5⃣ Joylashuv: <a href="${userData[chatId].locationLink}">Ko‘rish</a>\n\n` +
`Barcha ma'lumotlar to‘g‘rimi?`,
{
    parse_mode: 'HTML',
    reply_markup: { keyboard: [["✅ HA", "❌ YO‘Q"], ...commonKeyboard], resize_keyboard: true }
});
        return;
    }

    // =================== TASDIQLASH ===================
    if (userData[chatId]?.step === "confirm") {
        if (text === "✅ HA") {
            const username = msg.from.username ? `@${msg.from.username}` : " ";
            const orderText =
`<b>🚖 Yangi buyurtma!</b>\n\n` +
`<b>👤 Ism va telefon:</b> ${userData[chatId].namePhone}\n` +
`<b>💬 Telegram:</b> ${username}\n` +
`<b>📍 Yo‘nalish:</b> ${userData[chatId].route}\n` +
`<b>🧍 Yo‘lovchi / 📦 Pochta:</b> ${userData[chatId].passengers}\n` +
`<b>📍 Joylashuv:</b> <a href="${userData[chatId].locationLink}">Ko‘rish</a>`;

            bot.sendMessage(GROUP_ID, orderText, { parse_mode: 'HTML', disable_web_page_preview: false });
            bot.sendMessage(chatId, "So‘rovingiz guruhga yuborildi. Haydovchilar sizga tez orada aloqaga chiqadi", {
                reply_markup: { keyboard: commonKeyboard, resize_keyboard: true }
            });
            userData[chatId] = {};
        } else if (text === "❌ YO‘Q") {
            bot.sendMessage(chatId, "So‘rovingiz bekor qilindi.", {
                reply_markup: { keyboard: commonKeyboard, resize_keyboard: true }
            });
            userData[chatId] = {};
        }
        return;
    }
});

// ---------------- SERVER ----------------
app.listen(PORT, () => {
    console.log(`Server ${PORT} portda ishga tushdi`);
});

// ---------------- PING FUNKSIYASI ----------------
setInterval(() => {
    fetch(`${URL}/bot${token}`)
        .then(res => console.log('Ping status:', res.status))
        .catch(err => console.log('Ping xatolik:', err.message));
}, 60000);
