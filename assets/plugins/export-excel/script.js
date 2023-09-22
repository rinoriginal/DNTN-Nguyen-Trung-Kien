
var tableToExcel = (function () {
    var uri = 'data:application/vnd.ms-excel;charset=UTF-8;base64,',
        template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>',
        base64 = function (s) {
            return window.btoa(unescape(encodeURIComponent(s)))
        },
        format = function (s, c) {
            return s.replace(/{(\w+)}/g, function (m, p) {
                return c[p];
            })
        }
    return function (table, name) {
        if (!table.nodeType) table = document.getElementById(table)
        var ctx = {
            worksheet: name || 'Worksheet',
            table: table.innerHTML
        }
        return window.URL.createObjectURL(new Blob([format(template, ctx)]));
    }
})();



var tableToExcel_NEW_FORMAT = (function () {
    var uri = 'data:application/vnd.ms-excel;charset=UTF-8;base64,',
        template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>{table}</table></body></html>',
        base64 = function (s) {
            return window.btoa(unescape(encodeURIComponent(s)))
        },
        format = function (s, c) {
            return s.replace(/{(\w+)}/g, function (m, p) {
                return c[p];
            })
        }
    return function (table, name, title, EXCEL_CONFIG = {}) {
        let { congTy = "TELEHUB", phongBan = "PHÒNG CHĂM SÓC KHÁCH HÀNG" } = EXCEL_CONFIG
        var htmls = "";
        htmls += `<p style='margin-left:320px;font-size: 17px;font-weight: bold;font-family:Times New Roman;'>${congTy}`;
        for (let i = 0; i <= 120; i++) {
            htmls += "&nbsp;"
        }
        htmls += "Cộng hòa xã hội chủ nghĩa Việt Nam</p>";

        htmls += `<p style='margin-left:80px;font-size: 17px;font-weight: bold;font-family:Times New Roman;'>${phongBan}`;
        for (let i = 0; i <= 107; i++) {
            htmls += "&nbsp;"
        }
        htmls += "Độc lập - Tự do - Hạnh phúc</p>"
        htmls += "<p>&nbsp;</p>"
        htmls += "<p style='font-size: 16px;font-weight: bold;font-family:Times New Roman;'>";
        for (let i = 0; i <= 90; i++) {
            htmls += "&nbsp;"
        }
        htmls += title + "</p>"
        htmls += "<p>&nbsp;</p>"
        if (!table.nodeType) {
            let temp = document.getElementById(table).innerHTML.replace(/<a[^>]*>|<\/a>/g, "")// lấy thông tin từ bảng html và remote thuộc tính của thẻ a
            htmls += "<table border='1'>";
            htmls += temp;
            htmls += "</table>";
        }
        var ctx = {
            worksheet: name || 'Worksheet',
            table: htmls
        }
        return window.URL.createObjectURL(new Blob([format(template, ctx)]));
    }
})();