function headerReport(
  startTime,
  endTime,
  titleTable,
  sheet,
  {
    companyName = "BELLSYSTEM 24 -  HOA SAO",
    companyCell = "A2",
    companyMergeCell = "A2:B2",
    projectName = "TELEHUB T1",
    projectCell = "A3",
    projectMergeCell = "A3:B3",
    congHoaName = "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
    congHoaCell = "E2",
    congHoaMergeCell = "E2:I2",
    docLapName = "Độc lập - Tự do - Hạnh Phúc",
    docLapCell = "E3",
    docLapMergeCell = "E3:I3",
    titleCell = "B6",
    titleMergeCell = "B6:F6",
    timeCell = "C8",
    timeMergeCell = "C8:F8",
    month = false,
  }
) {
  sheet.getCell(companyCell).value = companyName;
  sheet.mergeCells(companyMergeCell);

  sheet.getCell(projectCell).value = projectName;
  sheet.mergeCells(projectMergeCell);

  sheet.getCell(congHoaCell).value = congHoaName;
  sheet.mergeCells(congHoaMergeCell);

  sheet.getCell(docLapCell).value = docLapName;
  sheet.mergeCells(docLapMergeCell);

  sheet.getRow(2).height = 25;
  // sheet.getRow(2).alignment = { vertical: "middle", horizontal: "center" };

  sheet.getRow(3).height = 20;
  // sheet.getRow(3).alignment = { vertical: "middle", horizontal: "center" };

  sheet.getRow(6).height = 30;
  sheet.getCell(titleCell).value = titleTable.toUpperCase();
  sheet.mergeCells(titleMergeCell);
  // sheet.getRow(6).font = { name: "Time New Roman", size: 18 };
  // sheet.getRow(6).height = 35;

  sheet.addRow([]);

  let _startTime = "...";
  let _endTime = "...";

  if (startTime && !endTime) {
    _startTime = _endTime = startTime;
  }

  if (startTime && endTime) {
    _startTime = startTime;
    _endTime = endTime;
  }

  if(month) {
    sheet.getCell(timeCell).value =
    "Thời gian: Từ Tháng: " + _startTime + " - Đến Tháng: " + _endTime;
  }else {
    sheet.getCell(timeCell).value =
    "Thời gian: Từ ngày: " + _startTime + " - Đến ngày: " + _endTime;
  }
  sheet.mergeCells(timeMergeCell);
  sheet.getRow(7).height = 20;

  // sheet.getCell("C7").font = {
  //   name: EXCEL_CONFIG.fontName,
  //   family: 4,
  //   size: 12,
  //   underline: "true",
  // };

  // alignment center
  [
    companyCell,
    projectCell,
    congHoaCell,
    docLapCell,
    titleCell,
    timeCell,
  ].forEach((i) => {
    sheet.getCell(i).alignment = { vertical: "middle", horizontal: "center" };
  });

  // font 10
  [
    companyCell,
    projectCell,
    congHoaCell,
    docLapCell,
    timeCell,
  ].forEach((i) => {
    sheet.getCell(i).font = { name: EXCEL_CONFIG.fontName, size: 10 };
  });

  // in Đậm
  [
    companyCell,
    congHoaCell,
  ].forEach((i) => {
    sheet.getCell(i).font = { name: EXCEL_CONFIG.fontName, size: 10, bold: true};
  });

  // in Đậm
  [
    titleCell
  ].forEach((i) => {
    sheet.getCell(i).font = { name: EXCEL_CONFIG.fontName, size: EXCEL_CONFIG.fontSizeTitle, bold: true};
  });

  // them 2 dong vao cuoi --> table bao cao se bat dau từ dòng 10
  sheet.addRow([]);
  sheet.addRow([]);
  // if (callback && typeof callback === "function") {
  //   callback(null, sheet);
  // }
}

module.exports = {
  headerReport,
};
