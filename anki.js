import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const https = require("https");
const fs = require("fs");
var XMLHttpRequest = require('xhr2');

let ankiURL = process.env.ANKI_URL
export function setAnkiURL(url){
  ankiURL = url;
}
export async function getAnkiNewWords(size) {
  const params = {
    query: "deck:4000-Essential-English-Words is:new"
  }
  const result = await invoke('findCards', 6, params);
  let res = [];
  for (let i = 0; i < size; i++) {
    const info = await invoke('cardsInfo', 6, { "cards": [result[i]] })
    // console.log(info[0]);
    console.log(info[0].fields.Word.value);
    res.push({ word: info[0].fields.Word.value, ipa: info[0].fields.IPA.value });
    let audioVal = info[0].fields.Sound.value
    if(audioVal){
      let audioUrl = audioVal.split(':')[1].split(']')[0];
      downloadAudio(audioUrl, info[0].fields.Word.value)
    }
  }
  // console.log(res)
  return res;
}

function invoke(action, version, params = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('error', () => reject('failed to issue request'));
    xhr.addEventListener('load', () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (Object.getOwnPropertyNames(response).length != 2) {
          throw 'response has an unexpected number of fields';
        }
        if (!response.hasOwnProperty('error')) {
          throw 'response is missing required error field';
        }
        if (!response.hasOwnProperty('result')) {
          throw 'response is missing required result field';
        }
        if (response.error) {
          throw response.error;
        }
        resolve(response.result);
      } catch (e) {
        reject(e);
      }
    });

    xhr.open('POST', ankiURL);
    xhr.send(JSON.stringify({ action, version, params }));
  });
}

export async function downloadAudio(audioUrl, word) {

  const params = {
    "filename": audioUrl
  }

  const res = await invoke('retrieveMediaFile', 6, params);
  // console.log(res)
  if (!res) return;
  const base64Data = res;

  // Decode the base64 data
  const decodedData = Buffer.from(base64Data, 'base64');

  // Write the decoded data to a file
  const dirName = 'MP3_NEW/'
  fs.writeFile(dirName + word + '.mp3', decodedData, (err) => {
    if (err) throw err;
    console.log('The file has been saved!');
  });
}
// console.log(`got list of decks: ${result}`);