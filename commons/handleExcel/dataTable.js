const ObjectSize = require('../../helpers/functions/object.size')

function dataTable(data, excelHeader, sheet, callback) {
  data.forEach((el, index) => {
    let rowData = [];
    let size = ObjectSize(excelHeader);

    Object.keys(excelHeader).map((key) => {
      rowData.push(el[excelHeader[key]])
    });
    sheet.addRow(rowData);

    for (let i = 1; i <= size; i++) {
      let charNameColumn = _.columnToLetter(i);
      sheet.lastRow.getCell(charNameColumn).border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      }
      sheet.lastRow.getCell(charNameColumn).font = { family: 4, name: 'Time New Roman', size: 10 };
      sheet.lastRow.getCell(charNameColumn).alignment = { vertical: 'middle', horizontal: 'center' };
    }
  });

  callback(null, sheet);
}

module.exports = dataTable;