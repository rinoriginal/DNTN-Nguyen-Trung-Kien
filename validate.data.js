const _ = require("underscore");
let { PROVINCES } = require("./helpers/constants/provinces.const");
let { DATAIMPORT } = require("./helpers/constants/dataImport.const");

function convertVietnamese(str) {
    str = str.toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ|ã|à|ã/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/!|@|%|\^|\*|\(|\)|\+|\=|\<|\>|\?|\/|,|\.|\:|\;|\'| |\"|\&|\#|\[|\]|~|$|_/g, "-");
    str = str.replace(/-+-/g, "-");
    str = str.replace(/^\-+|\-+$/g, "");

    return str;
}

function cleanPhoneNumber() {

    let countFail = 0;
    let countSuccess = 0;
  
    let resultCheck = DATAIMPORT.map(i => {
      let provinceFound = PROVINCES.find(j => {
        let check = j.typeArea == i.typeArea && convertVietnamese(j.name.trim().toLowerCase()) == convertVietnamese(i.name.trim().toLowerCase());
//         if(i.restaurant == "Kichi Kichi Vincom Đà Nẵng (DNG - 175)") 
//           console.log(convertVietnamese(j.name.trim().toLowerCase()), convertVietnamese(i.name.trim().toLowerCase()));
        return check;
      });
      if(!provinceFound) {
        countFail ++;
        console.log(i);
      }else countSuccess++;
      
      return provinceFound ? true : false;
    });
    console.log({countSuccess, countFail})
    return resultCheck;
}

// cleanPhoneNumber();
