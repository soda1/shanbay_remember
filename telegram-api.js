import { createRequire } from 'module'
const require = createRequire(import.meta.url);
const https = require("https");
const fs = require("fs");
const { exit, send } = require("process");
var tunnel = require('tunnel');
const axios = require('axios').default;
const FormData = require('form-data');


const botToken = process.env.TELE_TOKEN
const chatId = process.env.TELE_CHAT_ID
// const botToken = '5834402568:AAHWCwJW79tMmtnfCLLGvpQzbVZJXLFX8jg'
// const chatId = '5567559086'
// Create form data with the message and file attachments

// Send the form data to the bot API using Axios

export async function sendWords2telegram(words, proxy = false) {

  // Attach the MP3 files and corresponding texts to the form
  let axiosInstance = axios;
  if (proxy) {
    axiosInstance = axios.create({
      proxy: {
        host: '127.0.0.1',
        port: 7890,
      }
    });
  }
  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    await sendText2telegram(word.word + ' [' + word.ipa + ']', proxy);
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('document', fs.createReadStream("MP3_NEW/" + word.word + '.mp3'));
    await axiosInstance.post(`https://api.telegram.org/bot${botToken}/sendDocument`, form, {
      headers: form.getHeaders()
    })
      .then(response => {
        console.log('Message sent successfully:', response.data);
      })
      .catch(error => {
        console.error('Failed to send message:', error);
      });
  }
}


export async function sendText2telegram(text, proxy = false) {
  const data = JSON.stringify({
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
  });
  const options = {
    hostname: "api.telegram.org",
    port: 443,
    path: "/bot" + botToken + "/sendMessage",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  };
  if (proxy) {
    options.agent = tunnel.httpsOverHttp({
      proxy: {
        host: '127.0.0.1', //代理服务器域名或者ip
        port: 7890, //代理服务器端口
      },
    });
  }
  const req = https.request(options, (res) => {
    console.log(res);
    console.log(`statusCode: ${res.statusCode}`);
    res.on("data", () => {
      console.log("succeed");
    });
  });

  req.on("error", (error) => {
    console.error(error);
  });

  req.write(data);
  req.end();
}
