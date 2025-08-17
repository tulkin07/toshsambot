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
        bot.sendMessage(chatId, "Taksi chaqirish uchun ariza berish.\n📞 Telefon raqamingizni yuboring:", {
            reply_markup: {
                keyboard: [[{ text: "📱 Telefonni yuborish", request_contact: true }], ["🏠 Bosh sahifa"]],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        });
        userData[chatId] = { step: "phone" };
        return;
    }

    // Telefon qabul qilish
    if (userData[chatId]?.step === "phone" && msg.contact) {
        userData[chatId].phone = msg.contact.phone_number;
        userData[chatId].name = msg.contact.first_name || msg.from.first_name || "Noma’lum";
        userData[chatId].step = "route";

        bot.sendMessage(chatId, "Yo‘nalishingizni tanlang:", {
            reply_markup: { 
                keyboard: [["Samarqand → Toshkent", "Toshkent → Samarqand"]], 
                resize_keyboard: true 
            }
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

    // Location qabul qilinishi
    if (userData[chatId]?.step === "location" && msg.location) {
        const { latitude, longitude } = msg.location;
        userData[chatId].locationLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        userData[chatId].step = "confirm";

        // Tasdiqlash xabari
        bot.sendMessage(chatId,
`🤵 Yo‘lovchi\n` +
`1⃣ Ism: ${userData[chatId].name}\n` +
`2⃣ Telefon: ${userData[chatId].phone}\n` +
`3⃣ Telegram: ${msg.from.username ? `@${msg.from.username}` : " "}\n` +
`4⃣ Yo‘nalish: ${userData[chatId].route}\n` +
`5⃣ Yo‘lovchi / Pochta: ${userData[chatId].passengers}\n` +
`6⃣ Joylashuv: <a href="${userData[chatId].locationLink}">Ko‘rish</a>\n\n` +
`Barcha ma'lumotlar to‘g‘rimi?`,
{
    parse_mode: 'HTML',
    reply_markup: { keyboard: [["✅ HA", "❌ YO‘Q"]], resize_keyboard: true }
});
        return;
    }

    // Tasdiqlash step
    if (userData[chatId]?.step === "confirm") {
        if (text === "✅ HA") {
            const username = msg.from.username ? `@${msg.from.username}` : " ";
            const orderText =
`<b>🚖 Yangi buyurtma!</b>\n\n` +
`<b>👤 Ism:</b> ${userData[chatId].name}\n` +
`<b>📞 Telefon:</b> ${userData[chatId].phone}\n` +
`<b>💬 Telegram:</b> ${username}\n` +
`<b>📍 Yo‘nalish:</b> ${userData[chatId].route}\n` +
`<b>🧍 Yo‘lovchi / 📦 Pochta:</b> ${userData[chatId].passengers}\n` +
`<b>📍 Joylashuv:</b> <a href="${userData[chatId].locationLink}">Ko‘rish</a>`;

            bot.sendMessage(GROUP_ID, orderText, { parse_mode: 'HTML', disable_web_page_preview: false });
            bot.sendMessage(chatId, "So‘rovingiz guruhga yuborildi. Haydovchilar tez orada aloqaga chiqadi ✅", {
                reply_markup: { keyboard: [["🏠 Bosh sahifa"]], resize_keyboard: true }
            });
            userData[chatId] = {};
        } else if (text === "❌ YO‘Q") {
            bot.sendMessage(chatId, "So‘rovingiz bekor qilindi.", {
                reply_markup: { keyboard: [["🏠 Bosh sahifa"]], resize_keyboard: true }
            });
            userData[chatId] = {};
        }
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

// ---------------- PING FUNKSIYASI ----------------
setInterval(() => {
    fetch(`${URL}/bot${token}`)
        .then(res => console.log('Ping status:', res.status))
        .catch(err => console.log('Ping xatolik:', err.message));
}, 60000);
