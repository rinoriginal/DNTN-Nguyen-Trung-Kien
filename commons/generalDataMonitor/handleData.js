function handleData(dataCurrentMonth, dataPreviousMonth) {
  let percentage = (Math.abs(dataCurrentMonth - dataPreviousMonth) / (dataPreviousMonth > 0 ? dataPreviousMonth : 1) * 100).toFixed(2)

  const data = {
    dataCurrentMonth,
    dataPreviousMonth,
    percentage,
  }

  return data
}

module.exports = handleData;