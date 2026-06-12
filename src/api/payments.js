// @ts-check
const express = require("express");
const crypto = require("node:crypto");
const logger = require("../utils/logger");

const router = express.Router();

const CRYPTO_PAY_TOKEN = process.env.CRYPTO_PAY_TOKEN;
const API_URL = "https://pay.crypt.bot/api/";

// Функция для подписи вебхука
function verifySignature(signature, body) {
  if (!CRYPTO_PAY_TOKEN) return false;
  const secret = crypto.createHash('sha256').update(CRYPTO_PAY_TOKEN).digest();
  const checkString = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return checkString === signature;
}

// Зависимость от пула БД и миддлвара авторизации передается снаружи, чтобы не дублировать
module.exports = (pool, requireAuth) => {
  
  // Создание счета на оплату
  router.post("/checkout", requireAuth, async (req, res) => {
    try {
      if (!CRYPTO_PAY_TOKEN) {
        return res.status(500).json({ error: "Магазин временно не принимает платежи (нет токена)." });
      }

      // 9.99 USDT за безлимит
      const amount = "9.99";
      const asset = "USDT";
      
      const response = await fetch(`${API_URL}createInvoice`, {
        method: "POST",
        headers: {
          "Crypto-Pay-API-Token": CRYPTO_PAY_TOKEN,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          asset,
          amount,
          description: "Unlimited Subscription - Photo Metadata Studio",
          payload: req.user.id, // передаем ID пользователя, чтобы знать кому выдать
          paid_btn_name: "openBot",
          paid_btn_url: "https://photometadatastudio.onrender.com/?payment=success"
        })
      });

      const data = await response.json();
      if (!data.ok) throw new Error(data.error?.name || "Ошибка создания счета");

      res.json({ pay_url: data.result.pay_url });
    } catch (error) {
      logger.error({ error: error.message }, "Ошибка checkout");
      res.status(500).json({ error: "Ошибка при создании счета." });
    }
  });

  // Webhook для получения статуса от CryptoPay
  router.post("/webhook", express.json({
    verify: (req, res, buf) => {
      // @ts-ignore
      req.rawBody = buf.toString();
    }
  }), async (req, res) => {
    const signature = req.headers['crypto-pay-api-signature'];
    // @ts-ignore
    if (!signature || !verifySignature(signature, req.rawBody)) {
      return res.status(401).send("Invalid signature");
    }

    const { update_type, payload } = req.body;

    if (update_type === 'invoice_paid') {
      const userId = payload.payload; // Мы передавали user.id в поле payload при создании
      if (userId) {
        const client = await pool.connect();
        try {
          // Устанавливаем безлимит на 30 дней от текущего момента
          await client.query(
            "UPDATE public.user_credits SET subscription_end_date = NOW() + INTERVAL '30 days' WHERE user_id = $1",
            [userId]
          );
          logger.info({ userId, amount: payload.amount, asset: payload.asset }, "Оплата успешно обработана, выдан безлимит");
        } catch (err) {
          logger.error({ error: err.message, userId }, "Ошибка выдачи безлимита после оплаты");
        } finally {
          client.release();
        }
      }
    }

    res.sendStatus(200);
  });

  return router;
};
