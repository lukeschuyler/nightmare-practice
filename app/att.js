const { parsePhoneLines, 
        getUsage, 
        parseUsage, 
        parseDiscount, 
        parseMinutesATT,
        parseLineItems,
        parseLineItemsJoint,
        parseSurcharges,
        parseSurchargesJoint } = require('./parseATT.js')

const Bill = require('./models/bill_mod.js')
const LineItem = require('./models/line_item_mod.js')
const Usage = require('./models/usage_mod.js')
const UsageLine = require('./models/usage_line_mod.js')
const User = require('./models/user_mod.js')
const Line = require('./models/line_mod.js')

const Nightmare = require('nightmare');   


module.exports.crawlAtt = (req, response, next) => {
  let longWait = 12000
  console.log(longWait)
  // const nightmare = Nightmare({ show: true });
  const nightmare = Nightmare();
  let data = {}
  let id;
  let billId;
  let lineIdArray;
  data.user = {}
  data.line = {}
  data.lineItem = {}
  data.usage = {}
  data.usageLine = {}
  data.bill = {}
  const userName = req.body.userName.replace(/-/g, '')
  const password = req.body.password
  const billDate = req.body.billDate
  let PIN = req.body.PIN ? req.body.PIN : null

  let dataArray = []
  let monthCounter = 0

  let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let monthNum;

  months.filter((m, i) => {
    let num = m < 10 ? ("0" + (i+1)) : (i+1)
    if(m == billDate) {
      monthNum = num
    }
  })

  let billingMonth;

  const reset = () => {
    nightmare.end()
    .then(() => {
      longWait = longWait + 5000
      module.exports.crawlAtt(req, response, next)
    })
  }

  ///////////////////////////////////////////////////////
  /////////INITIAL FUNCTIONS CALLED ON REQUEST///////////
  ///////////////////////////////////////////////////////

  const getBillWithPin = () => {
    console.log('Loading ATT')
    nightmare
    .goto("https://www.att.com/olam/loginAction.olamexecute")
    .cookies.clear()
    .wait('#userName')
    .insert("#userName", userName)
    .insert("#password", password)
    .click('#loginButton')
    .wait(6000)
    .evaluate(() => document.querySelector('.alert-error').innerText)
    .then(res => {
      console.log(res)
      nightmare.end()
      response.status(404).json({ message: "User credentials incorrect" })
    })
    .catch(err => {
      enterPin()
    })
  }

  const enterPin = () => {
    console.log('entering Pin')
    nightmare
    .wait(6000)
    .insert('#passcode0', PIN)
    .click('.button.small.primary')
    .wait(longWait)
    .evaluate(() => {
      return
    })
    .then(() => {
      findAddressTab()
    })
    .catch(err => {
      console.log("err from url get in getBillWithPin: ", err)
      reset()
    })
  }

  // ******************* For No Pin Customers ********************

  const getBillNoPin = () => {
    console.log('Loading ATT')
    nightmare
    .goto("https://www.att.com/olam/loginAction.olamexecute")
    .cookies.clear()
    .wait('#userName')
    .insert("#userName", userName)
    .insert("#password", password)
    .click('#loginButton')
    // can't figure out another way to resolve other than to wait 15 seconds
    .wait(longWait)
    .evaluate(() => document.querySelector('.alert-error').innerText)
    .then(res => {
      console.log(res)
      // nightmare.end()
      response.status(404).json({ message: "User credentials incorrect" })
    })
    .catch(err => {
      findAddressTab()
    })
  }

  const findAddressTab = () => {
    console.log('getting address')
    nightmare
    .wait(5000)
    .goto('https://www.att.com/my/#/contactInfo?actionEvent=accountBillContactEdit&reportActionEvent=')
    .wait(longWait)
    .evaluate(() => document.querySelectorAll('#tab2').innerText)
    .then(res => {
      console.log("tab available: ", res)
      getAddress()
    })
    .catch(err => {
      console.log(err)
      longWait = longWait + 5000
      setTimeout(() => {
        findAddressTab()
      }, 5000)
    })
  }

  const getAddress = () => {
    nightmare
    .click('#tab2')
    .wait(1000)
    .evaluate(() => Array.from(document.querySelectorAll('#billingStreet .span12 .form-row p'))[1].innerText)
    .then(res => {
      console.log(res)
      data.user.address = res
      goToBillPage()
    })
    .catch(err => {
      console.log(err)
      // data.address = 'Could not locate address'
      // goToBillPage()
      reset()
    })
  }

  // Travel to bill page, see what billpage layout they have (joint, or just phone, represented by ACCORDIAN)

  const goToBillPage = () => {
    console.log('logged in as ' + userName)
    nightmare
    .goto('https://www.att.com/olam/passthroughAction.myworld?actionType=ViewBillDetails')
    .wait(longWait)
    .evaluate(() => document.querySelector('#billDetailsAccordion').innerText)
    .then(res => {
      getBillIfAccordion()
    })
    .catch(err => {
      nightmare
      .evaluate(() => document.querySelector('#tabcontent').innerText)
      .then(res => {
        getBillJointBill(res)
      })
      .catch(err => {
        getBillIfAccordion()
      })
    })
  }

  ///////////////////////////////////////////////////
  // Next section pertains to the joint bill layout//
  ///////////////////////////////////////////////////

  const getBillJointBill = (res) => {
    let string = res.toString().replace(/\n/g, ' ').replace(/\s\s+/g, ' ')
    let accountNumber = string.split(' ')[2] == 'Combined' ? string.split(' ')[4] : string.split(' ')[2]
    data.lines = parsePhoneLines(string)
    // console.log(string)
    // data.user.accountNumber = accountNumber
    checkUser(accountNumber, addLinesToDbJoint)
    .catch(error => {
      console.log(error)
    })
  }

  const addLinesToDbJoint = () => {
    Promise.all(data.lines.map((l, i) => Line.addLine({bill_id: billId, user_id: id, number: l.number, name: l.name})))
    .then(res => {
      console.log("ids: ", res)
      let lineResArray = res.map(l => l.toJSON())
      lineIdArray = lineResArray.map((l, i) => l.id)
      getLineItemsJointBill()
    })
  }

  const populateLineArrays = (res) => {
    let lines = data.lines
    data.monthlyCharges = []
    data.surcharges = []
    // console.log(res)
    lines.forEach((line, i) => {
      data.monthlyCharges.push(parseLineItemsJoint(res.monthly[i], line.number))
      data.surcharges.push(parseLineItemsJoint(res.surcharges[i], line.number))
    })
  }

  const getLineItemsJointBill = () => {
    let lines = data.lines
    console.log("lines: ", lines)
    nightmare
    .click('#accordplusAll')
    .wait(1000)
    .evaluate((lines) => {
      let monthly = lines.map((l, i) => document.querySelector(`#toggleMNTHCHRG${l.number}${i}T`).innerText)
      let surcharges = lines.map((l, i) => document.querySelector(`#toggleSrchgFees${l.number}${i}T`).innerText)
      // let govt = lines.map((l, i) => {
      //   return document.querySelector(`#toggleGVTFEE${l.number}${i}T`).innerText
      // })  
      let data = { monthly, surcharges }
      return data
    }, lines)
    .then(res => {
      populateLineArrays(res)
      getUsageTabContent()
    })
    .catch(err => {
      console.log("err acc panel1: ", err)
    })
  }

  const getUsageTabContent = () => {
    nightmare
    .click('#bPodUsageTab')
    .wait(5000)
    .evaluate(() => {
      return
    })
    .then(() => {
      getUsageByTime()
    })
    .catch(err => {
      getBillIfAccordion()
      console.log('err in usage tab: ', err)
    })
  }

  const getUsageByTime = () => {
    nightmare
    .click('#timeRange')
    .wait(2000)
    .evaluate(billDate => {
      let billTitle = []
      let dates = document.querySelectorAll('.wt_BodyFormSubmit')
      dates.forEach(date => {
        if(date.title.split(' ')[0] == billDate) { 
          billTitle.push(date.title)
        }
      })
      return billTitle
    }, billDate)
    .then(res => {
     checkBillDate(res)
    })
    .catch(err => {
      reset()
    })
  }


  const checkBillDate = (dateTitle) => {
    console.log("billing month: ", dateTitle[0])
    data.billingMonth = dateTitle[0]
    Bill.addBill({user_id: id, bill_date: data.billingMonth})
    .then(res => {
      let bill = res.toJSON()
      billId = bill.id
      console.log("billId: ", billId)
      addLineItemsToDb()
      .then(res => {
        determineUsageDate(dateTitle)
      })
    })
  }

  const determineUsageDate = (dateTitle) => {
    if(billDate && dateTitle != null) {
      nightmare
      .click(`A[title="${dateTitle[0]}"]`)
      .wait(5000)
      .evaluate(() => {
        return
      })
      .then(() => {
        extractUsage()
      })
      .catch(err => {
        console.log(err)
      })
    } else if (billDate && dateTitle == null) {
      getUsageTabContent()
    } else {
      extractUsage()
    }
  }

  const extractUsage = () => {
    nightmare
    .evaluate(() => document.querySelector('#tabcontent').innerText)
    .end()
    .then(res => {
      let string = res.toString().replace(/\n/g, ' ').replace(/\s\s+/g, ' ')
      // console.log(string)
      data.usage = parseUsage(string)
      response.status(200).json(data)
    })
    .catch(err => {
      getBillIfAccordion()
    })
  }

  //////////////////////////////////////////////////
  // Fires if bill page layout contains ////////////
  // certain structure (#billDetailsAccordion is ////
  // name of selector that would be present)/////////
  ///////////////////////////////////////////////////

  const getBillIfAccordion = () => {
    console.log('getting bill')
    if(!billDate) {
      checkBorderBox()
    } else {
      nightmare
      .wait(3000)
      .evaluate(() => document.querySelector('.account-number').innerText)
      .then(res => {
        accountNumber = res.split(' ')[2].replace(/\n+/g, '')
        data.accountNumber = accountNumber
        checkUser(accountNumber, changeDateAccordion)
      })
      .catch(err => {
        console.log("error from ifaccordian: ", err)
        // getUsageTabContent()
        reset()
      })
    }
  }

  const extractUsageAccordian = () => {
    console.log('parsing usage')
    nightmare
    .evaluate(() => document.querySelector('#ac8panel0').innerText)
    .then(res => {
      let usage = res.toString().replace(/\n/g, ' ').replace(/\s\s+/g, ' ')
      data.usage = getUsage(usage) ? getUsage(usage) : 'Usage not available for ' + billingMonth
      console.log("data.usage: ", data.usage)
      addUsageToDb()
    })
    .catch(err => {
      console.log("single line?", err)
      checkIfUsageAvailable()
    })
  }

  const addUsageToDb = () => {
    Usage.addUsage({bill_id: billId, total_used: data.usage.totalUsage, total_max: data.usage.usageMax})
    .then(res => {
      data.billingMonth = billingMonth
      let usage = res.toJSON()
      console.log(usage)
      let usageId = usage.id
      if (data.usage.usageBreakdown) {
        Promise.all(data.usage.usageBreakdown.map((u, i) => {
          return UsageLine.addUsageLine({usage_id: usageId, line_id: lineIdArray[i], usage_amount: u.monthlyUsage})
        }))
        .then(res => {
          // console.log(data)
          response.status(200).json(data)
          nightmare.end()
        })
      } else {
        response.status(200).json(data)
        nightmare.end()
      }
    })
  }

  const checkIfUsageAvailable = () => {
    console.log('check if available')
    nightmare
    .evaluate(() => Array.from(document.querySelectorAll('.alert-content')).map(el => el.innerText))
    .then(res => {
      data.billingMonth = billingMonth
      res.forEach((r, i) => {
        if (r.replace(/\n/g, '').replace(/\s\s+/g, '').replace(/\t/g, '') == 'The plan you were viewing isn’t available for the bill period you selected. Try another plan or bill period.') {
          data.usage = 'Usage Not Available for '+ billingMonth
          response.status(200).json(data)
          nightmare.end()
        }
        if(!data.usage && (i + 1) == res.length) {
          getSingleLineAccoridan()
        }
      })
    })
    .catch(err => {
      console.log(err, "no alert")
      getSingleLineAccoridan()
    })
  }

  const getSingleLineAccoridan = () => {
    nightmare
    .evaluate(() => document.querySelector('.borderBoxBig').innerText)
    .then(res => {
      let string = res.toString().replace(/\n/g, ' ').replace(/\s\s+/g, ' ').replace(/\t/g, '')
      console.log("tabmar res: ", string)
      if(!getUsage(string)) {
        data.usage.minutes = parseMinutesATT(string)
        data.usage.usageDetails = string
        data.usage.flag = 'NO DATA ON PLAN'
      }
      response.status(200).json(data)
      nightmare.end()
    })
    .catch(err => {
      console.log("error from tabmar: ", err)
    })
  }

  const changeDateUsage = () => {
    console.log('getting usage')
    nightmare
    .click('.icon-misc-piechartL')
    .wait(7000)
    .click('.awd-select')
    .wait(3000)
    .evaluate((monthNum) => {
      let billTitle = []
      let dates = document.querySelectorAll('.awd-select-list-item')
      Array.from(dates).forEach(date => {
        let parsedDate;
        if(date.innerText.replace(/\s\s+/g, '').split(' ')[0] == 'Recent' || date.innerText.replace(/\s\s+/g, '').split(' ')[0] == 'Current' || date.innerText.replace(/\s\s+/g, '').split(' ')[0] == 'Past') {
          parsedDate = date.innerText.replace(/\s\s+/g, ' ').split(' ')[3]
        } else {
          parsedDate = date.innerText.replace(/\s\s+/g, ' ').split(' ')[1]
        }
        if(parsedDate.slice(0,2) == monthNum) { 
          billTitle.push(parsedDate)
        }
      })
      return billTitle
    }, monthNum)
    .then(res => {
      locateUsageAccoridian(res)
    })
    .catch(err => {
      reset()
      console.log("err in changeDateUsage: ", err)
    })
  }

  const locateUsageAccoridian = (res) => {
    console.log("dates of billing in select box: ", res)
    billingMonth = res[0]
    data.billingMonth = billingMonth
    Bill.addBill({user_id: id, bill_date: billingMonth})
    .then(result => {
      getBillId(result, res)
    })
  }

  const getBillId = (result, res) => {
    let bill = result.toJSON()
    billId = bill.id
    // console.log(data.monthlyCharges)
    addLinesToDb(res)
  }

  const clickDateSelect = (res) => {
      addLineItemsToDb()
      .then(ids => {
        console.log("ids from sur: ", ids)
        let link = `li[value="${res[0]}"]`
        nightmare
        .click(link)
        .wait(6000)
        .evaluate(() => {
          return
        })
        .then(res => {
          extractUsageAccordian()
        })
        .catch(err => {
          console.log(err)
        })
      })
  }

  const addLineItemsToDb = () => {
   return Promise.all(data.monthlyCharges.map((l, i) => {
     return Promise.all(l.items.map((item, j) => {
        return  LineItem.addItem({user_id: id, bill_id: billId, line_id: lineIdArray[i], title: item.item, amount: item.amount, type: 'Monthly Charges'})
      }))
    }))
    .then(ids => {
      console.log("ids from month: ", ids)
       Promise.all(data.surcharges.map((l, i) => {
       return Promise.all(l.items.map((item, j) => {
          return  LineItem.addItem({user_id: id, bill_id: billId, line_id: lineIdArray[i], title: item.item, amount: item.amount, type: 'Surcharges'})
        }))
      }))
    })
  }

  const changeDateAccordion = () => {
    nightmare
    .click('.awd-select')
    .wait(3000)
    .evaluate(billDate => {
      let billTitle = []
      let dates = document.querySelectorAll('.awd-select-list-item')
      dates.forEach(date => {
        if(date.innerText.split(' ')[0] == billDate && date.value != 0) { 
          billTitle.push(date.value)
        }
      })
      return billTitle
    }, billDate)
    .then(res => {
      console.log("dates on billpage: ", res, billDate)
      let link = `li[value="${res[0]}|${accountNumber}|T01|W"]`
      nightmare
      .click(link.replace(/\s\s+/g, ''))
      .wait(6000)
      .evaluate(() => {
        return
      })
      .then(res => {
        checkBorderBox()
      })
      .catch(err => {
        console.log(err)
      })
    })
    .catch(err => {
      setTimeout(() => {
        changeDateAccordion()
      }, 5000)
    })
  }

  const checkBorderBox = () => {
    nightmare
    .evaluate(() => document.querySelector('.bill-high-borderbox').innerText)
    .then(res => {
      getAccordionPanel1()
    })
    .catch(err => {
      getAccordionPanel1()
    })
  }

  const getSurcharges = () => {
    console.log('getting surcharges')
    nightmare
    .evaluate(() => Array.from(document.querySelectorAll('.accord-content-block .margin-bottom20')).map(el => el.innerText))
    .then(res => {
      data.surcharges = parseSurcharges(res, data.lines)
      changeDateUsage()
    })
    .catch(err => {
      console.log("error getting surcharges: ", err)
    })
  }

  const getAccordionPanel1 = () => {
    nightmare
    .click('.expandContractLink')
    .wait(3000)
    .evaluate(() => { 
      return { whole: document.querySelector('#panel1').innerText, sections: Array.from(document.querySelectorAll('.MonthlyChargeAlert')).map(el => el.innerText) }
    })
    .then(res => {
      let string = res.whole.toString().replace(/\n/g, ' ').replace(/\s\s+/g, ' ')
      let sections = res.sections
      data.monthlyCharges = []
      data.lines = parsePhoneLines(string)
      sections.forEach((section, i) => {
        data.monthlyCharges.push(parseLineItems(section, data.lines[i].number))
      })
      // console.log('accord string', string)
      getSurcharges()
    })
    .catch(err => {
      console.log("err acc panel1: ", err)
    })
  }

  const addLinesToDb = (res) => {
    Promise.all(data.lines.map((l, i) => Line.addLine({bill_id: billId, user_id: id, number: l.number, name: l.name})))
    .then(result => {
      let lineResArray = result.map(r => {
        console.log(r)
        return r.toJSON()
      })
      lineIdArray = lineResArray.map((l, i) => l.id)
      console.log("lineIdArray: ", lineIdArray)
      clickDateSelect(res)
    })
    .catch(() => {
      getAccordionPanel1()
    })
  }

  // Calling functions based on what's given in req obj

  if(PIN) {
    console.log('Customer with PIN')
    getBillWithPin()
  }

  if(!PIN) {
    console.log('Customer no PIN')
    getBillNoPin()
  }

  const checkUser = (number, cb) => {
    console.log('checking user')
    return User.findOneByAccountNumber(number)
    .then(resId => {
      getUserInfo(resId, cb, number)
    })
    .catch(err => {
      console.log("error: ", err)
      return User.addUser({user_name: userName, address: data.user.address, account_number: accountNumber, provider: 'ATT'})
      .then(res => {
        let user = res
        id = user.id
        cb()
      })
    })
  }

  const getUserInfo = (resId, cb, number) => {
    console.log("resId: ", resId)
    let userId = resId
    if(resId) {
      // console.log(id)
      console.log("user exists: ", resId)
      id = userId
      cb()
    } else {
     return User.addUser({user_name: userName, address: data.user.address, account_number: number, provider: 'ATT'})
      .then(res => {
        let user = res
        console.log("no user: ", user)
        id = user.id
        console.log("id: ", id)
        cb()
      })
    }
  }


} // END crawlATT
