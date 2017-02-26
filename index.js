// we need a webserver
const express = require('express');
const app = express();

// we need a browser
const Nightmare = require('nightmare');

// i can't be fucked to mess directly with their rest api
const Nest = require('nest-cloud-api');

// fs to write access_token cache
const fs = require('fs');

// request because I am lazy as hell.
const request = require('request');

// utility code i scraped from some readme.md of nest-cloud-api
const NestOAuth2 = require('./nest-oauth2');
const config = require('./config');
const { clientId, secretId, email, pw } = config;

const myNestOauth2 = new NestOAuth2(clientId, secretId);

let token = false;

const hydrateCache = () => {
  // looks for a file called .token_cache. If it exists, 
  // it parses it as JSON, sets a stupid state variable because im lazy
  // and on a bus, the resolves the promise successfully. Otherwise
  // it rejects, causing the auth function to be called.
  return new Promise((resolve, reject) => {
    // readcache
    fs.readFile('.token_cache', 'utf8', (err, data) => {
      if(err){
        // reject on any read error; we'll blow out the old cache no matter
        // how it fucked up.
        return reject(err);
      }
      console.log('hydrating token, cache existed');
      const cache = JSON.parse(data);
      myNestOauth2.setOAuthAccessToken(cache.token, cache.dateObtained);
      if(!myNestOauth2.hasValidToken()){
        reject('Token Expired');
      }
      console.log('token is good');
      token = myNestOauth2.getOAuthAccessToken();
      resolve(myNestOauth2.getOAuthAccessToken());
    });
  }) 
};

const auth = () =>{
  // sets up a web server at localhost:3000 and then navigates to the nest
  // oauth login page, fills out the form, and hits the submit button. The
  // nest app registered in their interface has a redirect url which should
  // be localhost:3000/auth/nest/callback for this script to work.
  return new Promise((resolve, reject)=>{
    // auth if no token cached
    const nightmare = new Nightmare({show:true, webPreferences:{images: false}});
    app.get('/auth/nest/callback', function (req, res) {
      console.log('auth redirect caught in server');
      myNestOauth2.connect(req.query.code).then(retToken =>{
        token = retToken;
        console.log('authtoken: ', retToken);
        fs.writeFile('.token_cache', JSON.stringify({token, dateObtained: Date.now()}), 'utf8', ()=>{
          console.log('token cached for later use');
          nightmare.end();
          server.close();
          resolve();
        });
      })
    });

    const server = app.listen(3000, ()=>{
      // literally have to open a browser, go to oauth login URL,
      // fill out their stupid form, and catch the redirect with express 
      // webserver. Holy shit why can't i just get an apikey like github. 
      nightmare.goto(myNestOauth2.getConnectionURL())
        .type('input[data-test="input-email"]', email)
        .type('input[data-test="input-password"]', pw)
        .click('button[data-test="button-login-submit"]')
        .wait('button[data-test="button-oauth-submit"]')
        .click('button[data-test="button-oauth-submit"]')
        .catch(err=>{
          console.log('well shit', err);
        }); 
    });
  });
};

// gets pics and writes to disk based on the datetime of the last_event
const getPics = () => {
  // todo: separate file writes out from this function? maybe have getData
  // and getpics separately? Eventually could supporta nice interactive CLI
  // interface if we wanted.
  console.log('we are authed and talking with the nest API');
  var nest = new Nest(token.access_token);
  nest
    .request()
    .then(function(data) {
      const nestData = data;
      Object.keys(nestData.devices.cameras).map(camKey=>{
        const camera = nestData.devices.cameras[camKey];
        request(camera.last_event.animated_image_url).pipe(fs.createWriteStream(`${camera.last_event.start_time}.gif`)).on('close', ()=>{
          console.log('file written', camera.last_event.start_time);
        });
      });
    });
};

// control flow
hydrateCache().then(getPics).catch((err)=>{
  console.warn('authing: ', err);
  auth.then(getPics).catch(err=>{
    throw err;
  })
});
