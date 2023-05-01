import { createRequire } from 'module'
const require = createRequire(import.meta.url);
const https = require("https");
const fs = require("fs");
const { spawn } = require('child_process');
const { Configuration, OpenAIApi } = require("openai");
const { exit, send } = require("process");
import API from "./api.js";
import { invoke } from "./anki.js"
var tunnel = require('tunnel');
const axios = require('axios').default;

const args = process.argv.slice(2);

if (args.length < 3) {
  console.log("Please add telegram token,telegram chatId, and shanbay cookie")
  exit()
}
const token = args[0];
const chatId = args[1];
const ankiURL = args[2];
// const token = '5834402568:AAHWCwJW79tMmtnfCLLGvpQzbVZJXLFX8jg';
// const chatId = '5567559086';
// const ankiURL = 'http://43.139.63.70:8765'

// const axiosInstance = axios.create({
//   proxy: {
//     host: '127.0.0.1',
//     port: 7890,
//   }
// });



const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
  // apiKey: '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',
});
console.log(process.env.OPENAI_API_KEY)
const openai = new OpenAIApi(configuration);

// const openai = new OpenAIApi(configuration, undefined, axiosInstance);


async function chapGPT(words) {
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    // copy from https://github.com/piglei/ai-vocabulary-builder
    messages: [
      {
        role: "user",
        content: `Please write a short story which is less than 300 words, the story should use simple words and these special words must be included: ${words}. Also surround every special word with a single '*' character at the beginning and the end.`
      }
    ],
  });
  console.log(response["data"]["choices"][0]["message"]["content"]);
  return response["data"]["choices"][0]["message"]["content"]
};


const mp3DirMap = new Map([
  ["NEW", "MP3_NEW"],
  ["REVIEW", "MP3_REVIEW"],
])

const mp3ArticleMap = new Map([
  ["NEW", "new"],
  ["REVIEW", "review"],
])


async function send2telegram(text) {
  const data = JSON.stringify({
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
  });
  const options = {
    hostname: "api.telegram.org",
    port: 443,
    path: "/bot" + token + "/sendMessage",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  };
  // options.agent  = tunnel.httpsOverHttp({
  //   proxy: {
  //     host: '127.0.0.1', //代理服务器域名或者ip
  //     port: 7890, //代理服务器端口
  //   },
  // });
  const req = https.request(options, (res) => {
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

async function downloadAudio(audioUrl, audioName, wordsType) {
  const dirName = mp3DirMap.get(wordsType)
  const file = fs.createWriteStream(`${dirName}/${audioName}.audio`);
  return new Promise((resolve, reject) => {
    https.get(audioUrl, function (response) {
      response.pipe(file);
      response.on("end", () => { resolve() });
      response.on("error", (err) => { reject(err) });
    });
  });
}

async function getAnkiNewWords(size){
  const params = {
    query: "deck:4000-Essential-English-Words is:new"
  }
  const result = await invoke(ankiURL, 'findCards', 6, params);
  let res = [];
  for(let i = 0; i < size; i++){
    const info = await invoke(ankiURL, 'cardsInfo', 6, {"cards":[result[i]]})
    // console.log(info[0]);
    // console.log(info[0].fields.Word.value);
    res.push(info[0].fields.Word.value);
    
  }
  // console.log(res)
  return res;
}
async function sendResult(words){
  let message = `Today's ${words.length} new words to learning\n`
  message += words.join("\n");
  const cMessage = words.join(",");
  message += "\n";
  await send2telegram(message);
  const chatGPTMessage = await chapGPT(cMessage)
  // await send2telegram(await chapGPT(chatGPTMessage));
  await send2telegram(chatGPTMessage);
  const articleName = 'new'
  const child = spawn('edge-tts', ['--text', `"${chatGPTMessage}"`, '--write-media', `${articleName}_article.mp3`]);
  child.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
  });
  child.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });
  child.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });
}
async function main() {
  let words = await getAnkiNewWords(10);
  // console.log(Array.isArray(words))
  await sendResult(words);
  // chapGPT(words.join(","));
  // send2telegram("test");
}

main()
