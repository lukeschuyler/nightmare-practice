// Parse lines, names, and prices 

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

// ********************* Usage for DirectTV non-accordian bills *********************

module.exports.parseUsage = (string) => {
  // console.log(string)
  let stringArray = string.split(' ')
  let data = {}
  let lineArray = [];
  let n = 0
  let counter = 0
  let usagePhrase
  stringArray.forEach((s, i) => {
    if(s == 'details') {
      if(counter > 0) {
        usagePhrase = `${stringArray[i+3]}${stringArray[i+4]}`
        let lineInfo = stringArray[i-3][3] == '.' ? `${stringArray[i-3].replace(/\./g, '-')}` : stringArray[i-3] + ' (Not a phone)'
        let usageInfo = `${stringArray[i+1]}GB`
        lineArray.push({ line: lineInfo, monthlyUsage: usageInfo })
        n = n + (+stringArray[i+1])
      } else {
        counter++
      }
    }
  })
  data.totalUsage = n.toFixed(2) + 'GB'
  data.usageMax = usagePhrase
  data.usageBreakdown = lineArray
  // console.log(data)
  return data
}

// ************************ Usage for Accoridian (NO DIRECT TV) Bills ************************

const parseUsageAccordian = (string) => {
  // console.log(string)
  let stringArray = string.split(' ')
  let data = {}
  data.totalUsage = stringArray[0]
  data.usageMax = `${stringArray[2]} ${stringArray[3]}`
  let lineArray = [];
  stringArray.forEach((s, i) => {
    if(checkIfGB(s) && stringArray.indexOf(s) > 3) {
      let phoneNumber = stringArray.slice((stringArray.indexOf(s) - 12), stringArray.indexOf(s))
      phoneNumber = phoneNumber.join().replace(/\./g, '-').replace(/\,/g, '')
      lineArray.push({line: phoneNumber, monthlyUsage: s})
    }
    if(s.toLowerCase() == 'bonus') {
      console.log('BONUS STRING: ', string)
    }
  })
  data.usageBreakdown = lineArray
  // console.log(data)
  return data
}

// Checks if Usage for given bill is available

module.exports.getUsage = (string) => {
  // console.log(string)
  if(checkIfGB(string)) {
    console.log('usage available')
    return parseUsageAccordian(string)
  } else {
    return false
  }
}

module.exports.parseSurcharges = (arr, lineArr) => {
  console.log(arr)
  let chargeArray = []
  let lineIteration = 0
  arr.forEach((c, i) => {
    let itemArray = c.split('\n')
    if(itemArray[0] == 'Surcharges & fees') {
      let parsedItemArray = []
      itemArray.forEach((item, j) => {
        if(j > 1 && (j % 2) == 0 && item != "" && item != " ") {
          parsedItemArray.push({ item, amount: itemArray[j+1]})
        }
      })
      chargeArray.push({ line: lineArr[lineIteration].number, items: parsedItemArray })
      lineIteration++
    }
  })
  return chargeArray
}

module.exports.parseLineItems = (string, line) => {
  // console.log(string)
  let data = {}
  let billArray = string.split('\n')
  let chargeArray = []
  billArray.forEach((c, i) => {
    if(c[0] + c[1] == '  ' ) {
      console.log("c", c)
      c.replace('  ', '')
    }
    if((i % 2) == 1 && billArray[i-1].slice(0,24) != 'Monthly plan charges for') {
      let item = { item: billArray[i-1], amount: c }
      chargeArray.push(item)
    }
  })
  data = { line, items: chargeArray }
  return data
}

function insert(str, index, value) {
  return str.substr(0, index) + value + str.substr(index);
}

module.exports.parseLineItemsJoint = (string, line) => {
  // console.log(string)
  let data = {}
  let chargeArray = []
  let billArray = string.split('\n')
  billArray.forEach((l, i) => {
    let item = l.slice(0, l.indexOf('$'))
    let amount = l.slice(l.indexOf('$'))
    if(l != "" && l != " ") {
      chargeArray.push({ item , amount })
    }
  })
  data = { line, items: chargeArray }
  return data
}


module.exports.parseMinutesATT = (string) => {
  // console.log(string)
  let stringArray = string.split(' ')
  let data = {}
  stringArray.forEach((s, i) => {
    if(s == 'mins' && stringArray[i+1] == 'of') {
      data.totalUsage = `${stringArray[i-1]} ${s} ${stringArray[i+1]} ${stringArray[i+2]} ${stringArray[i+3]}`
    }
  })
  return data
}   

// Returns true if string ends in 'GB'

const checkIfGB = (string) => {
  // console.log(string)
  if(string.split(' ')[0].slice((string.split(' ')[0].length - 2)) == 'GB') {
    return true 
  } else {
    return false
  }
}
