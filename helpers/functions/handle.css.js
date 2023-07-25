/**
 * Dùng để xử lý: hiển thị/ làm mờ trên giao diện với trường status (active|not active) của các đối tượng. chi tiết xem trong file telehub-t1\assets\css\style.css
 * Có 2 case:
 * 1. nếu dùng phía server: dùng exports và require như bình thường.
 * 2. nếu dùng phía client: khi render ở phía .ejs hoặc ở file script.js trong folder assets. có 2 cách xử lý
 * 2.1: đang làm: đặt hàm này ở 2 nơi. 1 như bước case 1 làm. 2 là đặt ở file global.js khi render ra client.
 * 2.2: future: thì có thể truyền biến phía ejs và định nghĩa trong thẻ script vào đầu file .ejs (đoán thế chứ chưa làm :v)
 * @param {string} s trạng thái active | not active
 */
function classNameByStatus(s) {
    let _c = "S-N-found"; // style not found
    switch (s) {
        case 0:
            _c = "s-not-active";
            break;
        case 1:
            _c = "";
            break;
        default:
            break;
    }

    return _c;
}

module.exports = {
    classNameByStatus
}