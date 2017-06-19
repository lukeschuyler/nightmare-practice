// const express = require('express')
// const app = express()
// const { json, urlencoded } = require('body-parser');

// app.use(json())
// app.use(urlencoded({ extended: false }));

// app.get('/', (req, res, next) => {
//   const Nightmare = require('nightmare');   
//   const nightmare = Nightmare();
//   console.log('getting')
//   nightmare
//   .goto('https://duckduckgo.com')
//   .insert('#search_form_input_homepage', 'github nightmare')
//   .click('#search_button_homepage')
//   .wait(10000)
//   .evaluate(function () {
//     return document.querySelector('#zero_click_wrapper .c-info__title a').href
//   })
//   .then(link => {
//     res.status(200).json({ link })
//     nightmare
//     .end()
//   })
//   .catch(err => {
//     console.log("err", err)
//     nightmare
//     .end()
//   })
// });

// const port = process.env.PORT || 8082;
// app.listen(port, () => {
//   console.log(`Listening on port ${port}`);
// });

// module.exports = app;



const Nightmare = require('nightmare');
const nightmare = Nightmare({ show: false });

const URL = 'http://blog.oscarmorrison.com/nightmarejs-on-heroku-the-ultimate-scraping-setup/';
console.log('Welcome to Nightmare scrape\n==========');

nightmare
    .goto(URL)
    .wait('.post-title')
    .evaluate(() => document.querySelector('.post-title').textContent)
    .end()
    .then((result) => {
        console.log(result);
        console.log('=========\nAll done');
    })
    .catch((error) => {
        console.error('an error has occurred: ' + error);
    })
    .then(() => (console.log('process exit'), process.exit()));
