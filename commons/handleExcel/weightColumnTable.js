function setWeightColumnTable(
  sheet,
  { valueWidthColumn = [20, 20, 50, 20, 20, 20, 20, 20, 20, 20] },
  callback,
  ) {
  _.each(valueWidthColumn, function (item, j) {
    sheet.getColumn(++j).width = item;
  })

  if (callback && typeof callback === "function") {
    callback(null, sheet);
  }
}

module.exports = setWeightColumnTable;