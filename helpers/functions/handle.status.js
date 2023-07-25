/**
 * Xử lý trạng thái trên server. muốn xử lý trạng thái ở client thì sửa trong file /assets/global.js
 * @param {Mix} status trạng thái status 
 */
function getTextByStatus(status) {
  // dùng cho hiển thị trạng thái active|not active ở
  // 1. table
  // 2. modal: tạo | sửa nhãn hiệu, nhà hàng, bài viết, CTKM
  switch (status) {
    case "on":
    case "On":
    case "1":
    case 1:
    case true:
      return "Active";
    case "off":
    case "Off":
    case "0":
    case 0:
    case false:
      return "Not Active";
    default:
      return "NaN";
  }
}

module.exports = {
    getTextByStatus
};
