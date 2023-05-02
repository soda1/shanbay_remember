import { createRequire } from 'module'
const require = createRequire(import.meta.url);
const https = require("https");
const fs = require("fs");
const { spawn } = require('child_process');
const { Configuration, OpenAIApi } = require("openai")
const { exit, send } = require("process")
var tunnel = require('tunnel');
const axios = require('axios').default;
import { getAnkiNewWords } from "./anki.js"
import { sendText2telegram, sendWords2telegram } from "./telegram-api.js"

// const args = process.argv.slice(2);
// if (args.length < 3) {
//   console.log("Please add telegram token,telegram chatId, and shanbay cookie")
//   exit()
// }
// const axiosInstance = axios.create({
//   proxy: {
//     host: '127.0.0.1',
//     port: 7890,
//   }
// });



const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
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

async function sendResult(words) {
  let message = `Today's ${words.length} new words to learning\n`
  // message += words.map(item => item.word + '[' + item.ipa + ']').join("\n");
  const cMessage = words.map(item => item.word).join(',');;
  // message += "\n";
  await sendText2telegram(message);
  await sendWords2telegram(words)
  const chatGPTMessage = await chapGPT(cMessage)
  // await send2telegram(await chapGPT(chatGPTMessage));
  await sendText2telegram(chatGPTMessage);
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
