/**
 * Dùng để xử lý: hiển thị/ làm mờ trên giao diện với trường status (active|not active) của các đối tượng. chi tiết xem trong file telehub-t1\assets\css\style.css
 * Có 2 case:
 * @param {string} s trạng thái active | not active
 */
function HtmlEncode(s) {
    if (!s) return "";
    return s.replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
//Chuyển từ số thành Chữ cái (Tên cột trong excel)
//VD: 1 - A, 2 - B, 27 - Â
function columnToLetter(column) {
    var temp, letter = '';
    while (column > 0) {
        temp = (column - 1) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        column = (column - temp - 1) / 26;
    }
    return letter;
}

module.exports = {
    HtmlEncode,
    columnToLetter
}