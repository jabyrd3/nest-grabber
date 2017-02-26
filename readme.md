# nest grabber
Quick and dirty scriplet using express and nightmare to get nest Oauth 

# todo 
- [ ] Add more possible actions
- [ ] Use keytar or something to do pw & key cacheing
- [ ] interactive entry of passwords and keys to support keytar 
- [ ] flag to run in interactive / browse mode where you 
can navigate nest data model and get any data you want.
- [ ] options to save images to different paths for automation.
- [ ] find a node .eslintrc i like for autoformatting

# usage
- clone this repo
- navigate to it and run `npm install`
- for now, just copy config.ex.js to config.js and replace the strings. then run node index.js. files will be written to the directory index.js is in for now.
- `node index.js`