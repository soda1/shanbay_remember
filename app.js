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
// console.log(process.env.OPENAI_API_KEY)
const openai = new OpenAIApi(configuration);

// const openai = new OpenAIApi(configuration, undefined, axiosInstance);


async function chatGPT(words) {
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    // copy from https://github.com/piglei/ai-vocabulary-builder
    messages: [
      {
        role: "user",
        content: `
you are a good englist teacher, now you will be provided  with some words delimited by triple quotes.
perform the following action:
  1 -  provid  three common  meanings of each word, and each meaning have a usage
  2 -  use these provided words write a short story which is less than 200 words, the story should use simple words.
output format:
For each word, use the following format:
<word> /<IPA phonetic symbols>/: 
  1.<meaning>
    *Example*:<usage>
  2.<meaning>
    *Example*:<usage>
  3.<meaning>
    *Example*:<usage>
Word End
at each word definitions 'Word End' must exist
At the end of all the word definitions, add the following:
Story:<short story>
in the short story, use single * surround each provided word.


Text:
\`\`\`${words}\`\`\`
        `
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

function wrapWordsWithAsterisks(text, words) {
  // Use regular expression to match words and symbols
  const regex = new RegExp(`(?<!\\*)\\b(${words.join('|')})\\b(?!\\*)`, 'gi');
  return text.replace(regex, (match, p1) => {
    // Check if the matched word is already surrounded by asterisks
    if (match.startsWith('*') && match.endsWith('*')) {
      return match;
    } else {
      return `*${p1}*`;
    }
  });
}

async function sendResult(words) {
  let message = `Today's ${words.length} new words to learning\n`
  // message += words.map(item => item.word + '[' + item.ipa + ']').join("\n");
  const wordArray = words.map(item => item.word);
  const cMessage = wordArray.join(',');;
  // message += "\n";
  await sendText2telegram(message);
  const chatGPTMessage = await chatGPT(cMessage)
  const text = wrapWordsWithAsterisks(chatGPTMessage, wordArray);
  // await send2telegram(await chapGPT(chatGPTMessage));
  const splits = text.split('Story:')
  const wordContentArray = splits[0].split("Word End");

  //todo 
  // const wordContentArray = Content.split('----------');
  for(let i = 0; i < words.length; i++){
    const wordContent = wordContentArray[i];
    console.log(wordContent);
    await sendWords2telegram([words[i]]);
    sleep(10000);
    await sendText2telegram(wordContent);
    sleep(10000);

  }
  sleep(10000);
  await sendText2telegram(splits[1]);
  const articleName = 'new'
  const child = spawn('edge-tts', ['--text', `"${splits[1].trim()}"`, '--write-media', `${articleName}_article.mp3`]);
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

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  let words = await getAnkiNewWords(10);
  // console.log(Array.isArray(words))
  await sendResult(words);
  // chapGPT(words.join(","));
  // send2telegram("test");
}

main()
