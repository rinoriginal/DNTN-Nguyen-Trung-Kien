const ObjectSize = require('../../helpers/functions/object.size');
const setStyleThinCell = require('./style/setStyleThinCell');

function sumRow(sumRows, excelHeader, sheet, callback) {
  let size = ObjectSize(excelHeader);

  sheet.addRow([]);
  sheet.addRow(sumRows);
  sheet.lastRow.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.lastRow.font = { family: 4, name: 'Time New Roman', size: 10, };
  for (let i = 1; i <= size; i++) {
    let charNameColumn = _.columnToLetter(i);
    setStyleThinCell(sheet, charNameColumn);
  }

  sheet.lastRow.getCell('A').fill = {
    type: 'gradient',
    gradient: 'path',
    center: { left: 0.5, top: 0.5 },
    stops: [
      { position: 0, color: { argb: 'F33535' } },
      { position: 1, color: { argb: 'F33535' } }
    ]
  };

  sheet.lastRow.getCell('A').font = {
    name: 'Times New Roman',
    family: 4,
    size: 10,
    bold: true,
    color: { argb: 'FFFFFF' }
  };

  sheet.lastRow.getCell('A').border = {
    top: { style: "thin", color: { argb: 'F33535' } },
    left: { style: "thin", color: { argb: 'F33535' } },
    bottom: { style: "thin", color: { argb: 'F33535' } },
    right: { style: "thin", color: { argb: 'F33535' } }
  };

  return callback(null, sheet);
}

module.exports = sumRow;