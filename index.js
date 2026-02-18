const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios'); // Axios HTTP kütüphanesini ekliyoruz
const app = express();
const port = process.env.PORT || 3000;

// Ortam değişkenlerinden alacağız
const VERIFY_TOKEN = process.env.VERIFY_TOKEN; // Burası ortam değişkeninden okuyacak
const ACCESS_TOKEN = process.env.ACCESS_TOKEN; // WhatsApp API'si için erişim token'ı
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID; // WhatsApp telefon numarası ID'si

app.use(bodyParser.json());

// Webhook doğrulama endpoint'i
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // `VERIFY_TOKEN` ortam değişkeninden geldiği için, kodda değişiklik yapmaya gerek yok.
  // Önemli olan Render'daki ortam değişkeninin değeri.
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook Verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Gelen mesajları işleme ve yanıt gönderme endpoint'i
app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from; // Mesajı gönderen kullanıcının WhatsApp ID'si
      const messageType = message.type; // Mesajın tipi (text, image, vb.)

      // Sadece metin mesajlarını işliyoruz
      if (messageType === 'text') {
        const msgBody = message.text.body; // Gelen mesajın içeriği

        console.log(`Received message from ${from}: ${msgBody}`);

        // WhatsApp Cloud API üzerinden yanıt gönderme
        axios({
          method: 'POST',
          url: `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, // API URL'i
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`, // Erişim token'ımız
            'Content-Type': 'application/json'
          },
          data: {
            messaging_product: 'whatsapp',
            to: from, // Mesajı gönderen kişiye geri gönderiyoruz
            type: 'text',
            text: {
              body: `Sen şunu dedin: ${msgBody}` // Gelen mesajı yankılıyoruz
            }
          }
        })
      .then(() => {
          console.log(`Successfully sent echo message to ${from}`);
        })
      .catch((error) => {
          console.error('Error sending message:', error.response? error.response.data : error.message);
        });
      } else {
        console.log(`Received non-text message from ${from}. Type: ${messageType}`);
        // İstersen burada farklı mesaj tiplerini de işleyebilirsin
      }
    }
    res.sendStatus(200); // WhatsApp'a mesajı aldığımızı bildiriyoruz
  } else {
    res.sendStatus(404);
  }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
