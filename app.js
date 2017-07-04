const express = require('express')
const { json, urlencoded } = require('body-parser') 
const app = express()

const { crawlVerizon } = require('./verizon.js')
const { crawlAtt } = require('./att.js')

app.use(json())
app.use(urlencoded({ extended: false }));

app.post('/verizon', (req, response, next) => {
  crawlVerizon(req, response, next)
})

app.post('/att', (req, response, next) => {
  crawlAtt(req, response, next)
})

  // END POST

const port = process.env.PORT || 8084;

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

module.exports = app;







// const Nightmare = require('nightmare');   
// const nightmare = Nightmare({ show: true });
// // const nightmare = Nightmare();
// const express = require('express')
// const app = express()
// const { json, urlencoded } = require('body-parser');

// app.use(json())
// app.use(urlencoded({ extended: false }));

// // app.use((req, res, next) => {
// //   nightmare
// //   .goto('https://duckduckgo.com')
// //   .type('#search_form_input_homepage', 'github nightmare')
// //   .click('#search_button_homepage')
// //   .wait('#zero_click_wrapper .c-info__title a')
// //   .evaluate(function () {
// //     return document.querySelector('#zero_click_wrapper .c-info__title a').href
// //   })
// //   .end()
// //   .then(link => {
// //     res.status(200).json({ link })
// //   })
// //   .catch(err => {
// //     console.log(err)
// //   })
// // });

// app.get('/', (req, res, next) => {
//   console.log('getting')
//   nightmare
//   .goto('https://duckduckgo.com')
//   .type('#search_form_input_homepage', 'github nightmare')
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
//     console.log(err)
//   })
// });

// const port = process.env.PORT || 8082;
// app.listen(port, () => {
//   console.log(`Listening on port ${port}`);
// });

// module.exports = app;
