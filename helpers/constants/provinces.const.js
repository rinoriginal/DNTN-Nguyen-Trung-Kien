const TYPE_AREA = {
    bac: {
        name: "Miền Bắc",
        value: 1
    },
    trung:  {
        name: "Miền Trung",
        value: 2
    },
    nam:  {
        name: "Miền Nam",
        value: 3
    },
}

function getTextByTypeArea(s) {
    /**
     * Dùng cho hiển thị
     * 1. Trang tạo chương trình khuyến mại
     */
    switch (s) {
        case "1":
        case 1:
            return "Miền bắc";
        case "2":
        case 2:
            return "Miền trung";
        case "3":
        case 3:
            return "Miền nam";
        default:
            return "NaN";
    }
}

module.exports = {
    TYPE_AREA,
    getTextByTypeArea
}