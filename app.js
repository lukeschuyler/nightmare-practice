const Nightmare = require('nightmare');   
const nightmare = Nightmare({ show: true });
// const nightmare = Nightmare();
const express = require('express')
const app = express()
const { json, urlencoded } = require('body-parser');

app.use(json())
app.use(urlencoded({ extended: false }));

app.get('/', (req, res, next) => {
  console.log('getting')
  nightmare
  .goto('https://duckduckgo.com')
  .type('#search_form_input_homepage', 'github nightmare')
  .click('#search_button_homepage')
  .wait(10000)
  .evaluate(function () {
    return document.querySelector('#zero_click_wrapper .c-info__title a').href
  })
  .then(link => {
    res.status(200).json({ link })
    nightmare
    .end()
  })
  .catch(err => {
    console.log(err)
  })
});

const port = process.env.PORT || 8082;
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

module.exports = app;
