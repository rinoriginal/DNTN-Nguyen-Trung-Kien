var { PROVINCES, TYPE_AREA } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "provinces.const.js"
));
var { CATEGORY, CATEGORY_TYPE } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "category.const.js"
));
var { MENU, MENU_BRAND } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "menu.const.js"
));
var { DATAIMPORT } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "dataImport.const.js"
));

const { NEWS_COMMONS } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "news.const.js"
));
const {
  CRYTAL_JADE_MienBac,
  CRYTAL_JADE_MienNam,
  CRYTAL_JADE_INFO,
} = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "crytal_jade.js"
));

const { _500PIZZERIA_MienBac, _500PIZZERIA_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "500pizzeria.js"
));

const { CHILI_MienNam, CHILI_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "chili.js"
));

const { COWBOY_JACKS_MienNam, COWBOY_JACKS_MienBac, COWBOY_JACKS_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "CowboyJacks.js"
));

const { Daruma_MienBac, Daruma_MienNam, Daruma_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "Daruma.js"
));

const { GoGi_House_MienBac, GoGi_House_MienNam, GoGi_House_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "GoGiHouse.js"
));

const { GoGi_Steak_House_MienBac, GoGi_Steak_House_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "GoGi_Steak_House.js"
));

const { Hutong_MienBac, Hutong_MienNam, Hutong_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "Hutong.js"
));

const { iSushi_MienBac, iSushi_MienNam, iSushi_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "iSushi.js"
));

const { icook_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "icook.js"
));

const { KichiKichi_MienBac, KichiKichi_MienNam, KichiKichi_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "KichiKichi.js"
));

const { Ktop_MienBac, Ktop_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "Ktop.js"
));

const { KPub_MienBac, KPub_MienNam, KPub_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "KPub.js"
));

const { Manwah_MienBac, Manwah_MienNam, Manwah_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "Manwah.js"
));

const { phongon37_MienBac, phongon37_MienNam, phongon37_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "phongon37.js"
));

const { Shogun_MienBac, Shogun_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "Shogun.js"
));
const { SumoYakiniku_MienBac, SumoYakiniku_MienNam,SumoYakiniku_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "SumoYakiniku.js"
));

const { TheCoffeeIn_MienBac, TheCoffeeIn_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "TheCoffeeIn.js"
));

const { ashima_MienBac, ashima_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "ashima.js"
));

const { vuvuzela_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "vuvuzela.js"
));

const { thanhhoa_INFO } = require(path.join(
  _rootPath,
  "helpers",
  "constants",
  "baiviet",
  "thanhhoa.js"
));

module.exports = function () {
  console.log("Run import Data");
  // init provinces
  /**
   * Them bai viet mac dinh cho cho nhà hàng :
   * 1. Với điều kiện bài viết phải tương ứng với nhà hàng đã được tạo trên hệ thống. ko trùng sẽ ko tạo bài viết.
   * */

  // runListRestaurant([ListNhaHang], NEWS_500PIZZERIA, (err, result) => console.log(err, result) );
};