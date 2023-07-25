function templateExcel(startTime, endTime, titleTable, sheet, {
  companyName = 'GOLDEN GATE',
  companyNameMergeCell = ['A1', 'B1'],
  projectName = 'CHĂM SÓC KHÁCH HÀNG',
  projectNameMergeCell = ['A2', 'B2'],
  titleTableMergeCell = ['A6', 'H6'],
},
  callback) {
  sheet.getCell('A2').value = companyName;
  sheet.mergeCells('A2:B2');
  sheet.getCell('G2').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  sheet.mergeCells('G2:I2');
  sheet.getRow(2).height = 25;
  sheet.getRow(2).font = { family: 4, name: 'Time New Roman', size: 10, bold: true };
  sheet.getRow(2).alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.getCell('A3').value = projectName;
  sheet.mergeCells('A3:B3');
  sheet.getCell('G3').value = 'Độc lập - Tự do - Hạnh Phúc';
  sheet.mergeCells('G3:I3');
  sheet.getRow(3).height = 20;
  sheet.getRow(3).font = { family: 4, name: 'Time New Roman', size: 10, bold: false };
  sheet.getRow(3).alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.getCell('A6').value = titleTable;
  sheet.mergeCells('A6:I6');
  sheet.getRow(6).height = 35;
  sheet.getRow(6).font = { family: 4, name: 'Time New Roman', size: 16, bold: true };
  sheet.getRow(6).alignment = { vertical: 'middle', horizontal: 'center' };

  let _startTime = '...';
  let _endTime = '...';

  if (startTime && !endTime) {
    _startTime = _endTime = startTime;
  }

  if (startTime && endTime) {
    _startTime = startTime;
    _endTime = endTime;
  }

  sheet.getCell('A7').value = `Thời gian: Từ ngày: ${_startTime}  -  Đến ngày: ${_endTime}`;
  sheet.mergeCells('A7:I7');
  sheet.getRow(7).height = 20;
  sheet.getRow(7).font = { family: 4, name: 'Time New Roman', size: 10 };
  sheet.getRow(7).alignment = { vertical: 'middle', horizontal: 'center' };

  if (callback && typeof callback === "function") {
    callback(null, sheet);
  }
}

module.exports = templateExcel;