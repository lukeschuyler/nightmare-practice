const Nightmare = require('nightmare');  
const { parsePhoneLines, 
        parseUsageVerizon,
        parseLineItemsVerizon,
        getNumberLineVerizon,
        parseAddressVerizon } = require('./parseVerizon.js')

module.exports.crawlVerizon = (req, response, next) => {
  // const nightmare = Nightmare({ show: true });
  const nightmare = Nightmare();

  const data = {}

  const userName = req.body.userName
  const password = req.body.password
  const billMonth = req.body.billMonth
  let secret = req.body.secret

  let months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const getBill = () => {
    console.log('Loading Verizon')
    nightmare
    .goto('https://login.verizonwireless.com/amserver/UI/Login')
    .cookies.clearAll()
    .wait('#IDToken1')
    .insert('#IDToken1', userName)
    .click('#login-submit')
    .wait(5000)
    .evaluate(() => {
      return document.querySelector('#IDToken2').type
    }) 
    .then(res => {
      console.log(res)
      if(res == 'password') {
        submitPassword()
      } else {
        enterSecret()
      }
    })
    .catch(err => {
      console.log("no password input : ", err)
      enterSecret()
    })
  }

  const enterSecret = () => {
    console.log('entering secret')
    nightmare
    .insert('#IDToken1', secret)
    .click('#otherButton')
    .evaluate(() => {
      return
    })
    .then(() =>  {
      submitPassword()
    })
    .catch(err => {
      console.log("err from secret: ", err)
      submitPassword()
    })
  }

  const submitPassword = () => {
    nightmare
    .wait('#IDToken2')
    .insert("#IDToken2", password)
    .click('.o-red-button')
    .wait(8000)
    .evaluate(() => document.querySelector('.o-emergency-notice').innerText)
    .then(res => {
      console.log(res)
      response.status(404).json({ message: "User credentials incorrect" })
      nightmare.end()
    })
    .catch(err => {
      getAccountNumber()
    })
  }

  const getAccountNumber = () => {
    nightmare
    .evaluate(() => document.querySelector('.a-acc-num').innerText)
    .then(res => {
      let accountNumber = res.split('\xa0')[1]
      console.log(accountNumber)
      data.accountNumber = accountNumber
      // goToBillPage()
      getAddress()
    })
    .catch(err => {
      console.log('could not locate account number')
      data.accountNumber = 'could not locate account number'
      goToBillPage()
    })
  }

  const getAddress = () => {
    nightmare
    .goto('https://wbillpay.verizonwireless.com/vzw/accountholder/profile/displayContactInfo.action')
    .wait('#setContactInfo')
    .evaluate(() => Array.from(document.querySelectorAll('form div div div')).map(el => el.innerText))
    .then(res => {
      // console.log(res)
      data.address = parseAddressVerizon(res)
      goToBillPage()
    })
    .catch(err => {
      console.log("error getting address: ", err)
    })
  }

  const goToBillPage = () => {
    console.log('logged in as ' + userName)
    nightmare
    .goto('https://ebillpay.verizonwireless.com/vzw/accountholder/mybill/mybill.action#/')
    .wait(5000)
    .evaluate((billMonth, months) => {
      let link = document.querySelectorAll('.dtt-info')[1].href
      let parsedLink = link.slice(0, 95)
      let params = link.split('/')
      let linkDate = params.splice(-1, 1)[0]
      let currentMonth = linkDate.slice(0, linkDate.indexOf('%'))
      let spacedDate = linkDate.replace(/%20/g, " ").replace(/%2C/g, ',')
      let newDate = billMonth + spacedDate.slice(spacedDate.indexOf(' '))
      let year = spacedDate.slice(spacedDate.lastIndexOf(' ') + 1)
      if(months.indexOf(currentMonth) < months.indexOf(billMonth)) {
        +year--
        newDate = newDate.slice(0, newDate.lastIndexOf(' ')) + ' ' + year.toString()
      }
      let newLink = parsedLink + newDate
      return { newLink, newDate, spacedDate, year } 
    }, billMonth, months)
    .then(res => {
      nightmare
      .goto(res.newLink)
      .then(() => {
        nightmare
        .wait(5000)
        .click('.o-back-link')
        .then(res => {
          parseBillPage()
        })
      })
    })
    .catch(err => {
      console.log("err from gotobillpage: ", err)
      nightmare.end()
      .then(() => {
        module.exports.crawlVerizon(req, response, next)
      })
    })
  }

  const parseBillPage = () => {
    nightmare
    .wait(5000)
    .evaluate(() => document.querySelector('#viewBillLanding').innerText)
    .then(res => {
      let string = res.toString().replace(/\n/g, ' ').replace(/\s\s+/g, ' ')
      data.lines = parsePhoneLines(string)
      // console.log("lines: ", data)
      getUsage()
    })
    .catch(err => {
      console.log("err: ", err)
      getBill()
    })
  }

  const getEachNumberBillItems = () => {
    nightmare
    .goto('https://ebillpay.verizonwireless.com/vzw/accountholder/mybill/mybill.action#/')
    .wait(5000)
    .click('.o-charge-line-filter')
    .wait(1000)
    .evaluate(() => Array.from(document.querySelectorAll('.sub-link-wrapper a')).map(el => { return { href: el.href, number: el.innerText } }))
    .then(res => {
      data.lineItems = []
      Promise.all(res.map(line => extractLineItems(line)))
      .then(arr => {
        arr.forEach((charges, i) => {
          let string = charges.monthly
          let number = getNumberLineVerizon(res[i].number) 
          data.lineItems.push(parseLineItemsVerizon(string, number))
        })
        response.status(200).json(data)
        nightmare.end()
      })
    })
    .catch(err => {
      console.log("err in billITems: ", err)
    })
  }

  const extractLineItems = (item) => {
    let data = {}
    return new Promise((resolve, reject) => {
      nightmare
      .goto(item.href)
      .wait(5000)
      .evaluate(() => document.querySelector('.o-top-summary').innerText)
      .then(res => {
        data.monthly = res
        console.log("data: ", data)
        nightmare
        .click('.o-category')
        .evaluate(() => {
          return document.querySelector('.o-top-summary').innerText
        })
        .then(result => {
          console.log("classNames: ", result)
          data.surcharges = result
          // console.log(data)
          resolve(data)
        })
      })
    })
  }

  const getUsage = () => {
    nightmare
    .goto('https://ebillpay.verizonwireless.com/vzw/accountholder/mybill/mybill.action#/')
    .wait(5000)
    .evaluate((billMonth, months) => {
      let link = document.querySelectorAll('.dtt-info')[0].href
      let parsedLink = link.slice(0, 89)
      let params = link.split('/')
      let linkDate = params.splice(-1, 1)[0]
      let currentMonth = linkDate.slice(0, linkDate.indexOf('%'))

      let spacedDate = linkDate.replace(/%20/g, " ").replace(/%2C/g, ',')
      let newDate = billMonth + spacedDate.slice(spacedDate.indexOf(' '))
      let year = spacedDate.slice(spacedDate.lastIndexOf(' ') + 1)

      if(months.indexOf(currentMonth) < months.indexOf(billMonth)) {
        +year--
        newDate = newDate.slice(0, newDate.lastIndexOf(' ')) + ' ' + year.toString()
      }
      let newLink = parsedLink + newDate
      return { newLink, newDate, spacedDate, year } 
    }, billMonth, months)
    .then(res => {
      nightmare
      .goto(res.newLink)
      .wait(5000)
      .evaluate(() => document.querySelector('.o-activity-filter-content').innerText)
      // .end()
      .then(res => {
        let str = res.replace(/\n/g, ' ').replace(/\s\s+/g, ' ').replace(/\t/g, ' ')
        data.usage = parseUsageVerizon(str).usage
        data.billingMonth = parseUsageVerizon(str).billingMonth
        console.log("data: ", data)
        getEachNumberBillItems()
      })
      .catch(err => {
        console.log("err: ", err)
      })
    })
    .catch(err => {
      console.log(err)
    })
  }
  getBill()

}
