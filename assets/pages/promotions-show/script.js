var DFT = (function ($) {
  var _options = { id: "", url: "/brands", method: "POST", data: {} };
  let modalName = {
    create_brand: "modal_create_brand",
    update_brand: "modal_update_brand",
    create_restaurant: "modal_create_restaurant",
    update_restaurant: "modal_update_restaurant",
    create_category: "modal_create_category",
    update_category: "modal_update_category",
  };

  var convertUrlForQuery = function (url) {
    return url.replace("#", "");
  };

  // Lấy dữ liệu từ url
  var getUrlParams = function (url) {
    var obj = {};
    for (
      var i,
        o = /\+/g,
        a = /([^&=]+)=?([^&]*)/g,
        r = function (e) {
          return decodeURIComponent(e.replace(o, " "));
        },
        c = url.split("?")[1];
      (i = a.exec(c));

    ) {
      obj[r(i[1])] = r(i[2]);
    }
    delete obj.undefined;
    return obj;
  };

  var searchObj = {};
  var oldQuery = {};
  var listFilter = [];

  let filesToUpload = [];
  let CKEDITOR_NAME = {
    content: "content",
  };

  // danh sách nhà hàng đang được chọn
  let RestaurantSelected = [];

  /**
   * Lấy dữ liệu search và gửi lên server
   * @param msg
   */
  var queryFilter = function (msg) {
    var _data = _.pick($("#form-articles").serializeJSON(), _.identity);
    async.waterfall(
      [
        function (cb) {
          if (_.has(msg, "filter")) {
            listFilter = _.chain($(".filter"))
              .map(function (el) {
                return _.has(_data, $(el).attr("id"))
                  ? _.object([$(el).attr("id")], [_data[$(el).attr("id")]])
                  : null;
              })
              .compact()
              .reduce(function (memo, item) {
                memo[_.keys(item)] = _.values(item)[0];
                return memo;
              }, {})
              .value();
          }
          cb();
        },
      ],
      function (err) {
        var listSort = _.chain($("thead tr th").not('[data-sort="none"]'))
          .map(function (el) {
            return $(el).attr("data-field")
              ? $(el).attr("data-field") + ":" + $(el).attr("data-sort")
              : "";
          })
          .compact()
          .value();
        listSort = _.isEmpty(listSort) ? "" : "&sort=" + listSort[0];
        $(".page-loader").show();
        $.get(
          convertUrlForQuery(
            newUrl("articles", listFilter) +
              listSort +
              (_.has(window.location.obj, "ticket-href")
                ? "&" + window.location.obj["ticket-href"]
                : "")
          ),
          function (resp) {
            $(".page-loader").hide();
            if (
              resp.data.length == 0 &&
              Object.keys(window.location.obj).length > 0
            ) {
              swal(
                {
                  title: _config.MESSAGE.ARTICLE.SEARCH_NOT_FOUND_TITLE,
                  text: _config.MESSAGE.ARTICLE.SEARCH_NOT_FOUND_TEXT,
                  type: "warning",
                  confirmButtonColor: "#DD6B55",
                  confirmButtonText: "Quay lại!",
                  closeOnConfirm: true,
                },
                function () {
                  _.each(oldQuery, function (v, k) {
                    var el = $("#" + k);
                    if (el[0]) {
                      switch (el.prop("tagName")) {
                        case "INPUT":
                          el.val(v);
                          break;
                        case "SELECT":
                          el.val(v);
                          if (el.is(".selectpicker"))
                            el.selectpicker("refresh");
                          break;
                      }
                    }
                  });
                }
              );
            } else {
              oldQuery = listFilter;
              refreshArticles(resp);
            }
          }
        );
      }
    );
  };

  /**
   * Bắt sự kiện click
   */
  var bindClick = function () {
    // Nút Lọc/Search
    $(document).on("click", "#btn-search", function (e) {
      e.preventDefault();
      if ($("#title").val().length > 0) {
        window.location.obj["title"] = $("#title").val();
      } else {
        delete window.location.obj["title"];
      }

      if ($("#raw").val().length > 0) {
        window.location.obj["raw"] = $("#raw").val();
      } else {
        delete window.location.obj["raw"];
      }

      if (!_.isEqual($("#category").val(), "0")) {
        window.location.obj["category"] = $("#category").val();
      } else {
        if (!_.isEqual($("#group").val(), "0")) {
          window.location.obj["category"] = $("#category").val();
        } else {
          delete window.location.obj.category;
        }
      }

      if ($("#author").val().length > 0) {
        window.location.obj["author"] = $("#author").val();
      } else {
        delete window.location.obj.author;
      }

      if ($("#updater").val().length > 0) {
        window.location.obj["updater"] = $("#updater").val();
      } else {
        delete window.location.obj.updater;
      }

      if ($("#created").val().length > 0) {
        window.location.obj["created"] = $("#created").val();
      } else {
        delete window.location.obj.created;
      }

      var tmpString = "?";
      searchObj = {};
      _.each(window.location.obj, function (obj, i) {
        tmpString = tmpString + i + "=" + obj + "&";
        searchObj[i] = obj;
      });
      queryFilter({ filter: true });
    });

    // click category-parent
    $(document).on("click", "#importFile", function (e) {
      e.preventDefault();
      $("#file").click();
    });

    $(document).on("click", "#btnCreatePromotions", handleEventClickBtnCreatePromotions);

    function handleEventClickBtnCreatePromotions(e) {
      e.preventDefault();
      let data = {
        title: $("#title").val(),
        content: CKEDITOR.instances[CKEDITOR_NAME.content].getData(),
        status: $(`#create_promotion_status`).val(),
        startTime: moment($(`#startTime`).val(), "DD/MM/YYYY"),
        endTime: moment($(`#endTime`).val(), "DD/MM/YYYY"),

      };

      if(!data.startTime.isValid() || !data.endTime.isValid()) return swal({title: "Vui lòng chọn thời gian!"});
      data.startTime = data.startTime._d;
      data.endTime = data.endTime._d;

      let params = {};
      data.idRestaurants = _.pluck(RestaurantSelected, "_id");
      var formData = new FormData();
      formData.append("title", data.title);
      formData.append("content", data.content);
      formData.append("status", data.status);
      formData.append("idRestaurants", data.idRestaurants);
      formData.append("startTime", data.startTime);
      formData.append("endTime", data.endTime);

      for (var i = 0, len = filesToUpload.length; i < len; i++) {
        formData.append("files", filesToUpload[i].file);
      }

      $.ajax({
        url: "/promotions?" + $.param(params),
        data: formData,
        processData: false,
        contentType: false,
        type: "POST",
        success: function (data) {
          console.log("DONE", data);

          if (data.code != 200) {
            swal({
              title: "Thông báo",
              text: data.message,
              type: "error",
            });
          } else {
            swal({
              title: "Thông báo",
              text: "Thành công",
            });
            _.LoadPage(window.location.hash);
          }
        },
        error: function (data) {
          console.log("ERROR - " + data.responseText);
        },
      });
    }
  };

  /**
   * Bắt sự kiện submit
   */
  var bindSubmit = function () {};

  /**
   * Hiển thị tên trường/cột theo file config
   */
  var bindValue = function () {
    _.each(_.allKeys(_config.MESSAGE.ARTICLE), function (item) {
      $("." + item).html(_config.MESSAGE.ARTICLE[item]);
    });
  };

  var bindChange = function () {
    // Nút changeStatus modal_create_category
    $(document).on("change", "#create_promotion_status", (e) =>
      handleEventChangeStatus(e, "create_promotion")
    );
    $(document).on("change", "#file", handleEventChangeImportFile);
    $(document).on(
      "change",
      'input[name="checkbox-area"]',
      handleEventChangeCheckBoxArea
    );
    $(document).on(
      "change",
      'input[name="checkbox-brands"]',
      handleEventChangeCheckBoxBrands
    );
    $(document).on(
      "change",
      'input[name="checkbox-restaurants"]',
      handleEventChangeCheckBoxRestaurants
    );

    function handleEventChangeStatus(e, type) {
      e.preventDefault();
      let $this = $(e.currentTarget);
      let isChecked = $this.is(":checked");
      renderStatus(type, isChecked);
    }

    function handleEventChangeImportFile(e) {
      e.preventDefault();
      let $this = $(e.currentTarget);
      let files = $this.prop("files");

      renderFileToContent(files);
    }

    function renderFileToContent(files) {
      /**
       * name: "js.png"
       * lastModified: 1592758038016
       * lastModifiedDate: Sun Jun 21 2020 23:47:18 GMT+0700 (Indochina Time)
       * webkitRelativePath: "",
       * size: 2609
       * type: "image/jpeg"
       */
      console.log({ files });
      $("#tblListFile tbody").html(
        Object.keys(files)
          .map((i, index) => {
            filesToUpload.push({
              id: index,
              file: files[i],
            });
            return (
              "<tr>" +
              [
                `<td>Tên tài liệu</td>`,
                `<td class="text-center">${moment(i.lastModifiedDate).format(
                  "HH:mm DD/MM/YYYY"
                )}</td>`,
                `<td>${files[i].name}</td>`,
                `<td class="text-center"><i class="zmdi zmdi-close-circle text-danger delete-file"></i></td>`,
              ].join("") +
              "</tr>"
            );
          })
          .join("")
      );
    }

    function handleEventChangeCheckBoxArea(e) {
      e.preventDefault();
      let target = $(e.currentTarget);
      let cbAll = $('input[name="checkbox-area"][value="1,2,3"]');
      let cbNotAll = $('input[name="checkbox-area"]').not('[value="1,2,3"]');
      let typeSearch = [];
      if (target.val() === "1,2,3") {
        if (target.is(":checked")) {
          cbNotAll.prop("checked", false);
          typeSearch = target.val();
        } else typeSearch = "";
      } else {
        cbAll.prop("checked", false);
        typeSearch = getValueItemChecked(`input[name="checkbox-area"]`);
      }

      // ajax search
      console.log({ typeSearch });

      let params = {};
      params.scope = "search-by-area";
      params.typeArea = typeSearch;

      _AjaxData("/provinces?" + $.param(params), "GET", null, (resp) => {
        var title = "";
        var message = "";
        var type = "";
        if (resp.code != 200) {
          title = "Đã có lỗi xảy ra";
          message = resp.message;
          type = "error";
          console.log({ resp });
          swal({
            title: title,
            text: message,
            type: type,
          });
        } else if (resp.code == 200) {
          renderProvinces(resp.message, typeSearch);
        }
      });
    }

    function handleEventChangeCheckBoxBrands(e) {
      e.preventDefault();
      let target = $(e.currentTarget);
      let cbAll = $('input[name="checkbox-brands"][value="all"]');
      let cbNotAll = $('input[name="checkbox-brands"]').not('[value="all"]');
      let typeSearch = [];
      let typeAreaChecked = getValueItemChecked('input[name="checkbox-area"]');
      let idProvinceSelected = $('select[name="province[]"]');

      if (!idProvinceSelected.val())
        return swal({ title: "Vui lòng chọn tỉnh thành trước!" });
      if (target.val() === "all") {
        if (target.is(":checked")) {
          typeSearch = cbNotAll
            .map((index, item) => $(item).val())
            .get()
            .join(",");
          cbNotAll.prop("checked", false);
        } else typeSearch = "";
      } else {
        cbAll.prop("checked", false);
        typeSearch = getValueItemChecked(`input[name="checkbox-brands"]`);
      }

      let params = {};
      params.scope = "search-in-promotions-new";
      params.idBrand = typeSearch;
      params.idProvince = idProvinceSelected.val().join(",");

      // ajax search
      _AjaxData("/restaurants?" + $.param(params), "GET", null, (resp) => {
        var title = "";
        var message = "";
        var type = "";
        if (resp.code != 200) {
          title = "Đã có lỗi xảy ra";
          message = resp.message;
          type = "error";
          console.log({ resp });
          swal({
            title: title,
            text: message,
            type: type,
          });
        } else if (resp.code == 200) {
          renderRestaurants(resp.message);
        }
      });
    }

    /**
     * All
     * - seleced
     * @param {event} e
     */
    function handleEventChangeCheckBoxRestaurants(e) {
      e.preventDefault();
      let target = $(e.currentTarget);
      let cbAll = $('input[name="checkbox-restaurants"][value="all"]');
      let cbNotAll = $('input[name="checkbox-restaurants"]').not(
        '[value="all"]'
      );

      let typeSearch = [];
      if (target.val() === "all") {
        typeSearch = cbNotAll
          .not('[value="all"]')
          .map((index, item) => JSON.parse($(item).attr("data-json")))
          .get();
        if (target.is(":checked")) {
          // thêm hết
          cbNotAll.prop("checked", true);
          // union: gộp 2 mảng thành 1 mảng ko trùng giá trị
          RestaurantSelected = mergeByProperty(RestaurantSelected, typeSearch, "_id");
        } else {
          // xóa hết
          let idRemain = _.difference(
            _.pluck(RestaurantSelected, "_id"),
            _.pluck(typeSearch, "_id")
          );
          RestaurantSelected = RestaurantSelected.filter((i) =>
            idRemain.includes(i._id)
          );
          cbNotAll.prop("checked", false);
        }
      } else {
        typeSearch = JSON.parse(target.attr("data-json"));
        if (target.is(":checked")) {
          // thêm phần tử hiện tại
          RestaurantSelected = _.union(RestaurantSelected, [typeSearch]);
        } else {
          // xóa phần tử hiện tại
          RestaurantSelected = RestaurantSelected.filter(
            (i) => i._id != typeSearch._id
          );
        }
        cbAll.prop("checked", false);
      }

      // render to table selected
      renderRestaurantSelected(RestaurantSelected);
    }
  };

  var bindModal = function () {
    /**
     * shown.bs.modal: bật phát ăn luôn
     * shown.bs.modal: đợi hết css mới ăn
     * hide.bs.modal: tắt phát ăn luôn
     * hidden.bs.modal: đợi hết css mới ăn
     */

    $("#modal_update_brand").on("shown.bs.modal", function () {});

    $("#modal_update_brand").on("hide.bs.modal", function () {
      $("#listBrand li").removeClass("active");
    });
  };

  function renderStatus(modalName, status) {
    $(`#${modalName}_status`).val(status ? "on" : "off");
    return $(`#${modalName}_status_text`).html(getTextByStatusNumber(status));
  }

  /**
   * validate form tự làm để hiển thị trên modal, do validate engin đang dùng không hỗ trợ trên modal
   * @param {String} formName Tên form
   * @param {Object} data các giá trị của form cần check
   */
  function validateFormCustomize(formName, data) {
    let pass = false;

    for (let i = 0; i < Object.keys(data).length; i++) {
      const ele = Object.keys(data)[i];
      let fieldCheck = $(`#${formName}_${ele}`);
      let fieldValidate = $(`#${formName}_${ele}_validate`);
      console.log({ ele, val: fieldCheck.val() });
      if (fieldCheck.hasClass("required")) {
        if (fieldCheck.val() != "") {
          pass = true;
          fieldValidate.removeClass("active");
        } else {
          pass = false;
          fieldValidate.addClass("active");
          break;
        }
      }
    }

    return pass;
  }

  /**
   * render dữ liệu tỉnh thành vào select2
   * nếu type = 1,2,3 (toàn quốc) --> mặc định selected all các tỉnh thành
   * @param {Object} data mảng dữ liệu tỉnh thành
   * @param {String} type loại khu vực
   */
  function renderProvinces(data, type) {
    let selected = type === "1,2,3" ? "selected" : "";
    $("#province").html(
      data
        .map(
          (i) =>
            `<option class="duallist-option" value='${i._id}' ${selected}>${i.name}</option>`
        )
        .join("")
    );
    // IMPORTANT: refresh
    $("#province").selectpicker('refresh');
  }

  function renderRestaurants(data) {
    let countCol = $(`#tblRestaurant thead th`).length;
    if (data.length === 0)
      return $(`#tblRestaurant tbody`).html(
        `<tr> <td class='alert alert-danger text-center' colspan='${countCol}'> Không có dữ liệu </td> </tr>`
      );
    $(`#tblRestaurant tbody`).html(
      data
        .map((i, index) => {
          let areaName = "";
          let provinceName = "";
          if (i.idProvince) {
            areaName = getTextByTypeArea(i.idProvince.typeArea);
            provinceName = i.idProvince.name;
          }
          return (
            "<tr>" +
            [
              `<td title="${i.name}">${i.name}</td>`,
              `<td title="${areaName}">${areaName}</td>`,
              `<td class="">${provinceName}</td>`,
              `<td class="text-center">
                        <span><input name="checkbox-restaurants" type="checkbox" value="${
                          i._id
                        }" data-json=\'${JSON.stringify(i)}\'></span>
                    </td>`,
            ].join("") +
            "</tr>"
          );
        })
        .join("")
    );
  }

  function renderRestaurantSelected(data) {
    let countCol = $(`#tblRestaurantSelected thead th`).length;
    let dataRender = Object.assign([], data);
    dataRender = dataRender.map(i => {
        if(i.idBrand) i.nameBrand = i.idBrand.name;
        if(i.idProvince){
            i.typeArea = i.idProvince.typeArea;
            i.nameProvince = i.idProvince.name;
        }
        return i;
    })
    dataRender = _.groupBy(data, (e) => e.nameBrand ? e.nameBrand: 'NaN');
    console.log({dataRender})
    if (data.length === 0)
      return $(`#tblRestaurantSelected tbody`).html(
        `<tr> <td class='alert alert-danger text-center' colspan='${countCol}'> Không có dữ liệu </td> </tr>`
      );
    $(`#tblRestaurantSelected tbody`).html(
        Object.keys(dataRender).map((i, index) => {
            let ele = dataRender[i];
            var _class = (index % 2 == 0) ? 'odd' : 'even';

            let groupByArea = _.groupBy(ele, (e) => e.typeArea ? e.typeArea: 'NaN');
            let colArea = ele.map(j => {

                return "<tr>" + [
                    `<td class="${_class}">${getTextByTypeArea(j.typeArea)}</td>`,
                    `<td class="${_class}">${j.nameProvince}</td>`,
                    `<td class="${_class}">${j.name}</td>`
                ].join("") + "</tr>"
            }).join("");

            let areaName = "";
            let nameProvince = "";
            if(i.idProvince) {
                areaName = getTextByTypeArea(i.idProvince.typeArea);
                nameProvince = i.idProvince.name;
            }
            return "<tr>" + [
                `<td rowspan="${ele.length > 0 ? ele.length + 1 : 0}" class="${_class}">${i}</td>`,
                colArea        
            ].join("") + "</tr>"
        }).join("")
    )
  }

  // copy :)
  function mergeByProperty(arr1, arr2, prop) {
    _.each(arr2, function (arr2obj) {
      var arr1obj = _.find(arr1, function (arr1obj) {
        return arr1obj[prop] === arr2obj[prop];
      });

      //If the object already exist extend it with the new values from arr2, otherwise just add the new object to arr1
      arr1obj ? _.extend(arr1obj, arr2obj) : arr1.push(arr2obj);
    });

    return arr1;
  }

  return {
    init: function () {
      bindClick();
      bindSubmit();
      bindValue();
      bindChange();
      bindModal();
      // var url = '/brands' + (_.has(window.location.obj, 'page') ? ('?page=' + window.location.obj['page']) : '');
      // $('.page-loader').show();
      renderRestaurantSelected(restaurantsData);

    },
    uncut: function () {
      // xóa sự kiện khi rời trang hoặc load lại trang khi dùng _.LoadPage(window.location.hash)
      // nếu không, có thể sẽ bị load lại nhiều lần khi sử dụng trên trang này
      $(document).off("click", "#btn-search");
      $(document).off("change", ".select-box-all");
      $(document).off("change", ".select-box-cell");
      $(document).off("click", "#form-articles .pagination li a");
      $(document).off("click", ".btn-remove");
      $(document).off("click", "#btn-delSelection");
      $(document).off("click", ".sort");
      $(document).off("change", "#group-select");
      $(document).off("click", "#btnCreateCategory");
      $(document).off("change", "#create_promotion_status");
      $(document).off("click", ".create-new-by-category");
      $(document).off("click", ".category-parent");
      $(document).off("click", ".category-child");
      $(document).off("click", ".add-menu");
      $(document).off("click", "#importFile");
      $(document).off("click", "#btnCreatePromotions");
      $(document).off("change", 'input[name="checkbox-area"]');
      $(document).off("change", 'input[name="checkbox-brands"]');
      $(document).off("change", 'input[name="checkbox-restaurants"]');
      $(document).off("change", "#file");
    },
  };
})(jQuery);
