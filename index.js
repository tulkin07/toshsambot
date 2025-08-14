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

// ---------------- BOT HANDLERLARI ----------------
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    userData[chatId] = {};
    bot.sendMessage(chatId, "Assalomu alaykum! Kim sifatida davom etasiz?", {
        reply_markup: { keyboard: [["🚖 Haydovchi", "🧍 Yo‘lovchi"]], resize_keyboard: true, one_time_keyboard: true }
    });
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Haydovchi
    if (text === "🚖 Haydovchi") {
        bot.sendMessage(chatId, "Agar siz haydovchi sifatida qo'shilmoqchi bo'lsangiz @frontend_soft ga yoki +998900678097 ga murojaat qiling.");
        return;
    }

    // Yo‘lovchi
    if (text === "🧍 Yo‘lovchi") {
        bot.sendMessage(chatId, "Taksi chaqirish uchun ariza berish.\nIsmingiz va telefon raqamingizni kiriting.\nMasalan: Aliyev Ali +998xx xxx xx xx");
        userData[chatId] = { step: "name_phone" };
        return;
    }

    // Ism va telefon
    if (userData[chatId]?.step === "name_phone") {
        userData[chatId].namePhone = text;
        userData[chatId].step = "route";
        bot.sendMessage(chatId, "Yo‘nalishingizni tanlang:", {
            reply_markup: { keyboard: [["Samarqand → Toshkent", "Toshkent → Samarqand"]], resize_keyboard: true }
        });
        return;
    }

    // Yo‘nalish
    if (userData[chatId]?.step === "route") {
        userData[chatId].route = text;
        userData[chatId].step = "passengers";
        bot.sendMessage(chatId, "Nechta yo‘lovchi yoki pochta:", {
            reply_markup: {
                keyboard: [
                    ["Pochta bor", "1 kishi", "2 kishi"],
                    ["3 kishi", "4 kishi","Boshqa"]
                ],
                resize_keyboard: true
            }
        });
        return;
    }

    // Yo‘lovchi soni / pochta
    if (userData[chatId]?.step === "passengers") {
        userData[chatId].passengers = text;
        userData[chatId].step = "location";

        // Location so‘rash
        bot.sendMessage(chatId, "Iltimos, hozirgi joylashuvingizni ulashing:", {
            reply_markup: {
                keyboard: [[{ text: "Joylashuvni yuborish", request_location: true }], ["🏠 Bosh sahifa"]],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
        return;
    }

    // Location qabul qilinishi va guruhga xabar jo‘natish
    if (userData[chatId]?.step === "location" && msg.location) {
        const { latitude, longitude } = msg.location;
        const locationLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        let username = msg.from.username ? `@${msg.from.username}` : " ";

        let finalText =
`<b>🚖 Yangi buyurtma!</b>\n\n` +
`<b>👤 Ism va telefon:</b> ${userData[chatId].namePhone}\n` +
`<b>💬 Telegram:</b> ${username}\n` +
`<b>📍 Yo‘nalish:</b> ${userData[chatId].route}\n` +
`<b>🧍 Yo‘lovchi / 📦 Pochta:</b> ${userData[chatId].passengers}\n` +
`<b>📍 Joylashuv:</b> <a href="${locationLink}">Ko‘rish</a>`;

        // Guruhga yuborish
        bot.sendMessage(GROUP_ID, finalText, { parse_mode: 'HTML', disable_web_page_preview: false });

        // Foydalanuvchiga tasdiqlash
        bot.sendMessage(chatId, `Joylashuvingiz qabul qilindi!\n\n<b>Joylashuv:</b> <a href="${locationLink}">Ko‘rish</a>`, { 
            parse_mode: 'HTML', disable_web_page_preview: false,
            reply_markup: { keyboard: [["🏠 Bosh sahifa"]], resize_keyboard: true }
        });

        userData[chatId] = {}; // stepni tozalash
        return;
    }

    // Bosh sahifa
    if (text === "🏠 Bosh sahifa") {
        bot.sendMessage(chatId, "Bosh sahifa:", {
            reply_markup: { keyboard: [["🚖 Haydovchi", "🧍 Yo‘lovchi"]], resize_keyboard: true }
        });
    }
});

// ---------------- SERVER ----------------
app.listen(PORT, () => {
    console.log(`Server ${PORT} portda ishga tushdi`);
});

// ---------------- PING FUNKSIYASI (uxlab qolmasligi uchun) ----------------
setInterval(() => {
    fetch(`${URL}/bot${token}`)
        .then(res => console.log('Ping status:', res.status))
        .catch(err => console.log('Ping xatolik:', err.message));
}, 30000); 
