function styleThinCell(sheet, nameColumn) {
  sheet.lastRow.getCell(nameColumn).border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" }
  };
}

module.exports = styleThinCell;