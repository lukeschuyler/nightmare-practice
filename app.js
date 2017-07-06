const express = require('express')
const { json, urlencoded } = require('body-parser') 
const app = express()

const { crawlVerizon } = require('./app/verizon.js')
const { crawlAtt } = require('./app/att.js')

app.use(json())
app.use(urlencoded({ extended: false }));

app.post('/verizon', (req, response, next) => {
  crawlVerizon(req, response, next)
})

app.post('/att', (req, response, next) => {
  crawlAtt(req, response, next)
})


const port = process.env.PORT || 8084;

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

module.exports = app;
