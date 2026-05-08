import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

function normalizePhone(phone) {
  let msisdn = phone.replace(/\D/g, "");

  if (msisdn.startsWith("0")) {
    msisdn = "254" + msisdn.slice(1);
  } else if (msisdn.startsWith("7") && msisdn.length === 9) {
    msisdn = "254" + msisdn;
  }

  return msisdn;
}

async function sendStkPush(amount, phone, accountNo) {
  const username = process.env.TINYPESA_USERNAME;
  const apiKey = process.env.TINYPESA_API_KEY;

  const url = new URL(
    "https://api.tinypesa.com/api/v1/express/initialize/"
  );

  url.searchParams.set("username", username);

  const payload = {
    amount,
    msisdn: normalizePhone(phone),
    account_no: accountNo,
    callback_url: "https://example.com/webhook"
  };

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Apikey: apiKey
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  return {
    success: response.ok,
    phone,
    data
  };
}

app.post("/bulk-stk", async (req, res) => {
  try {
    const { amount, numbers } = req.body;

    if (!amount || !numbers?.length) {
      return res.status(400).json({
        error: "Amount and numbers are required"
      });
    }

    const results = [];

    for (const phone of numbers) {
      try {
        const transactionCode = `TXN-${Date.now()}-${Math.floor(
          Math.random() * 1000
        )}`;

        const result = await sendStkPush(
          amount,
          phone,
          transactionCode
        );

        results.push(result);

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          success: false,
          phone,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      total: numbers.length,
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server running...");
});
