module.exports.parseLineItemsVerizon = (string, number) => {
  let data = {}
  let chargeArray = string.split('\n')
  let itemArray = []
  chargeArray.forEach((c, i) => {
    if(c === "") {
      chargeArray.splice(chargeArray.indexOf(c))
    }
    if(c != '') {
     let amount = c.split(' ').pop()
     let item = c
     itemArray.push({ amount, item })
    }
  })
  data = { line: number, items: itemArray }
  return data
}

module.exports.parsePhoneLines = (string) => {
  let stringArray = string.split(' ')
  // console.log(stringArray)
  let lineArray = [];
  stringArray.forEach((s, i) => {
    let line = {}
    if(s[3] == '-' && s[7] == '-') {
      line.number = s
      line.name = `${stringArray[i-2]} ${stringArray[i-1]}`
      line.price = stringArray[i+1]
      lineArray.push(line)
    }
  })
  return lineArray
}

module.exports.parseAddressVerizon = (arr) => {
  let newArray = []
  let address;
  arr.forEach((item, i) => {
    let newItem = item.replace(/\n+/g, '').replace(/\s\s+/g, '').replace(/\t+/g, '')
    if(newItem != "" && newItem != " ") {
      newArray.push(newItem)
    } 
    let itemArray = newItem.split(' ')
      itemArray.forEach((t, i) => {
      let counter = 0
      if(t[3] == '-' && t[7] == '-' && counter == 0) {
        address = newArray.splice(i).join(' ')
        counter++
      }
    })
  }) 
  address = newArray[0]
  return address
}

module.exports.getNumberLineVerizon = (string) => {
  let stringArray = string.split(' ')
  let number
  stringArray.forEach(s => {
    if(s[3] == '-' && s[7] == '-') {
      number = s
    }
  })
  return number
}

const parseMinutesVerizon = (string) => {
  let stringArray = string.split(' ')
  let billArray = string.split('')
  let lineArray = []
  stringArray.forEach((s, i) => {
    if (s == 'min' && stringArray[i-2][3] == '-' && stringArray[i-2][7] == '-') {
      let line = stringArray[i-2]
      let monthlyUsage = stringArray[i-1] + ' ' + s
      lineArray.push({ line, monthlyUsage })
    }
  })
  return lineArray
}

module.exports.parseUsageVerizon = (string) => {
  // console.log(string)
  let stringArray = string.split(' ')
  let data = {}
  data.usage = {}
  let lineArray = []
  stringArray.forEach((s, i) => {
    if(s == 'available:' && stringArray[i-5] == 'used: ') {
      data.usage.totalUsage = stringArray[i-4] + 'GB'
      data.usage.usageMax = `${stringArray[i+1]}${stringArray[i+2]}`
    }
    if(s == 'used:') {
      data.usage.totalUsage = stringArray[i+1] + 'GB'
      data.usage.usageMax = `${stringArray[i+3]}${stringArray[i+4]}`
    }
    if(s == 'View' && stringArray[i-2] == 'GB') {
      let line = stringArray[i-4]
      let monthlyUsage = stringArray[i-3] + stringArray[i-2] 
      lineArray.push({ line, monthlyUsage })
    }
    if(s[0] == '(' && s[6] == '-') {
      data.billingMonth = s.replace(/\(/g, '').replace(/\)/g, '')
    } 
    if(s[3] == '(' && s[9] == '-' && (s[1] + s[2]) == 'GB') {
      data.billingMonth = s.slice(3).replace(/\(/g, '').replace(/\)/g, '')
    } 
    if(s[4] == '(' && s[10] == '-' && (s[2] + s[3]) == 'GB') {
      data.billingMonth = s.slice(4).replace(/\(/g, '').replace(/\)/g, '')
    } 
    if(stringArray[1] == 'Talk' && stringArray[3] == 'minutes:') {
      data.usage.flag = 'NO DATA ON PLAN'
      data.usage.usageDetails = string
      data.usage.usageBreakdown = parseMinutesVerizon(string)
      data.usage.totalUsage = stringArray[4] 
      data.usage.usageMax = stringArray[7] + stringArray[8]
    }
    if(s.toLowerCase() == 'bonus' && stringArray[i+1].toLowerCase() == 'data') {
      data.usage.bonusData = `${stringArray[i+2]} ${stringArray[i+3]} ${stringArray[i+4]}`
    }
  })
  if(!data.flag) {
    data.usage.usageBreakdown = lineArray
  }
  return data
}
