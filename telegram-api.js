import { createRequire } from 'module'
const require = createRequire(import.meta.url);
const https = require("https");
const fs = require("fs");
const { exit, send } = require("process");
var tunnel = require('tunnel');
const axios = require('axios').default;
const FormData = require('form-data');


let botToken = process.env.TELE_TOKEN
let chatId = process.env.TELE_CHAT_ID

export function setBotToken(token) {
  botToken = token;
}
export function setChatId(chat_id) {
  chatId = chat_id;
}

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
    // await sendText2telegram(word.word + ' [' + word.ipa + ']', proxy);
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
  let axiosInstance = axios;
  if (proxy) {
    axiosInstance = axios.create({
      proxy: {
        host: '127.0.0.1',
        port: 7890,
      }
    });
  }
  const data = JSON.stringify({
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
  });
  axiosInstance.post('https://api.telegram.org/bot' + botToken + '/sendMessage', data, {
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(res => {
    console.log(`status: ${res.status}`);
    console.log(`data: ${JSON.stringify(res.data)}`);
  }).catch(err => {
    console.error(err);
  })
}
