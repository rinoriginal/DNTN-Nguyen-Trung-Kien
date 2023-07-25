const ObjectSize = require('../../helpers/functions/object.size');
const setStyleThinCell = require('./style/setStyleThinCell');

function headerTable(sheet, excelHeader, configHeader, callback) {
  sheet.addRow([]);
  sheet.addRow([]);
  
  let rowHeader = []
  let size = 0;

  if (callback && typeof callback === "function") {
    size = ObjectSize(excelHeader);
    Object.keys(excelHeader).map((key) => {
      rowHeader.push(configHeader[key]);
    });
  } else {
    size = excelHeader.length;
    _.each(excelHeader, function (header) {
      rowHeader.push(configHeader[header]);
    });
  }

  sheet.addRow(rowHeader)
  sheet.lastRow.height = 30;
  sheet.lastRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  sheet.lastRow.font = { family: 4, name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FFFFFF' } }

  for (let i = 1; i <= size; i++) {
    let charNameColumn = _.columnToLetter(i);

    setStyleThinCell(sheet, charNameColumn);

    sheet.lastRow.getCell(charNameColumn).fill = {
      type: 'gradient',
      gradient: 'path',
      center: { left: 0.5, top: 0.5 },
      stops: [
        { position: 0, color: { argb: EXCEL_CONFIG.colorTableHeader } },
        { position: 1, color: { argb: EXCEL_CONFIG.colorTableHeader } }
      ]
    };
  }

  callback(null, sheet)
}

module.exports = headerTable;