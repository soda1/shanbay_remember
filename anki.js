import { createRequire } from 'module'
const require = createRequire(import.meta.url);
const https = require("https");
const fs = require("fs");
const { spawn } = require('child_process');
const { Configuration, OpenAIApi } = require("openai");
const { exit } = require("process");
import API from "./api.js";
var XMLHttpRequest = require('xhr2');

export function invoke(ankiURL, action, version, params={}) {
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
      xhr.send(JSON.stringify({action, version, params}));
  });
}
// console.log(`got list of decks: ${result}`);