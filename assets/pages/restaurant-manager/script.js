var DFT = function ($) {

    var _options = { id: '', url: '/brands', method: 'POST', data: {} };
    let modalName = {
        create_brand: "modal_create_brand",
        update_brand: "modal_update_brand",
        create_restaurant: "modal_create_restaurant",
        update_restaurant: "modal_update_restaurant",
        create_category: "modal_create_category",
        update_category: "modal_update_category",
    };

    var convertUrlForQuery = function (url) {
        return url.replace('#', '');
    }

    var searchObj = {};
    var oldQuery = {};
    var listFilter = [];

    let delay = (function () {
        let timer = 0;
        return (callback, ms) => {
            clearTimeout(timer);
            timer = setTimeout(callback, ms);
        }
    })();

    /**
     * Lấy dữ liệu search và gửi lên server
     * @param msg
     */
    var queryFilter = function (msg) {
        var _data = _.pick($('#form-articles').serializeJSON(), _.identity);
        async.waterfall([
            function (cb) {
                if (_.has(msg, 'filter')) {
                    listFilter = _.chain($('.filter'))
                        .map(function (el) {
                            return _.has(_data, $(el).attr('id')) ? _.object([$(el).attr('id')], [_data[$(el).attr('id')]]) : null;
                        })
                        .compact()
                        .reduce(function (memo, item) {
                            memo[_.keys(item)] = _.values(item)[0];
                            return memo;
                        }, {})
                        .value();
                }
                cb();
            }
        ], function (err) {
            var listSort = _.chain($('thead tr th').not('[data-sort="none"]'))
                .map(function (el) {
                    return $(el).attr('data-field') ? $(el).attr('data-field') + ':' + $(el).attr('data-sort') : '';
                })
                .compact()
                .value();
            listSort = _.isEmpty(listSort) ? '' : '&sort=' + listSort[0];
            $('.page-loader').show();
            $.get(convertUrlForQuery(newUrl('articles', listFilter) + listSort + (_.has(window.location.obj, 'ticket-href') ? ('&' + window.location.obj['ticket-href']) : '')), function (resp) {
                $('.page-loader').hide();
                if (resp.data.length == 0 && Object.keys(window.location.obj).length > 0) {
                    swal({
                        title: _config.MESSAGE.ARTICLE.SEARCH_NOT_FOUND_TITLE,
                        text: _config.MESSAGE.ARTICLE.SEARCH_NOT_FOUND_TEXT,
                        type: "warning",
                        confirmButtonColor: "#DD6B55",
                        confirmButtonText: "Quay lại!",
                        closeOnConfirm: true
                    }, function () {
                        _.each(oldQuery, function (v, k) {
                            var el = $('#' + k);
                            if (el[0]) {
                                switch (el.prop('tagName')) {
                                    case 'INPUT':
                                        el.val(v);
                                        break;
                                    case 'SELECT':
                                        el.val(v);
                                        if (el.is('.selectpicker')) el.selectpicker('refresh');
                                        break;
                                }
                            }
                        });
                    });
                } else {
                    oldQuery = listFilter;
                    refreshArticles(resp);
                }
            });
        });
    };

    /**
     * Bắt sự kiện click
     */
    var bindClick = function () {
        // Nút Lọc/Search
        $(document).on('click', '#btn-search', function (e) {
            e.preventDefault();
            if ($('#title').val().length > 0) {
                window.location.obj['title'] = $('#title').val();
            }
            else {
                delete window.location.obj['title'];
            }

            if ($('#raw').val().length > 0) {
                window.location.obj['raw'] = $('#raw').val();
            }
            else {
                delete window.location.obj['raw'];
            }

            if (!_.isEqual($('#category').val(), '0')) {
                window.location.obj['category'] = $('#category').val();
            }
            else {
                if (!_.isEqual($('#group').val(), '0')) {
                    window.location.obj['category'] = $('#category').val();
                }
                else {
                    delete window.location.obj.category;
                }
            }

            if ($('#author').val().length > 0) {
                window.location.obj['author'] = $('#author').val();
            }
            else {
                delete window.location.obj.author;
            }

            if ($('#updater').val().length > 0) {
                window.location.obj['updater'] = $('#updater').val();
            }
            else {
                delete window.location.obj.updater;
            }

            if ($('#created').val().length > 0) {
                window.location.obj['created'] = $('#created').val();
            }
            else {
                delete window.location.obj.created;
            }

            var tmpString = '?';
            searchObj = {};
            _.each(window.location.obj, function (obj, i) {
                tmpString = tmpString + i + '=' + obj + '&';
                searchObj[i] = obj;
            });
            queryFilter({ filter: true });
        });

        // click add-menu
        $(document).on('click', '.add-menu', function (e) {
            e.stopPropagation();

            let target = $(e.currentTarget);
            if (!target.attr("category-json")) return swal({ title: 'Thông báo !', text: "Không thể thực hiện", type: "error" });
            let dataJSON = JSON.parse(target.attr("category-json"));

            $("#modal_create_category_idRestaurant").val(dataJSON.idRestaurant);
            $("#modal_create_category_idParent").val(dataJSON._id);
            $("#modal_create_category_type").val(dataJSON.type);
            $("#modal_create_category_weight").val(
                $(`#${dataJSON._id}`).parent().find(".category-child").length + 1
            );
        });

        // click create-new-by-category
        $(document).on('click', '.create-new-by-category', function (e) {
            e.preventDefault();
            let target = $(e.currentTarget);
            let tabActive = $(".menu-tab.active");
            let idType = tabActive.attr("data-id");
            let tabType = {
                "1": "menu",
                "2": "info",
                "3": "promotion"
            };
            if (!tabType[idType]) return;

            let categoryActive = getIDCategoryActive(tabType[idType]);
            if (categoryActive) {
                // window.open(`/#news?idCategory=${categoryActive}`);
                window.location.hash = `news?idCategory=${categoryActive}`;
            } else {
                swal({
                    title: "Thông báo!",
                    text: "Vui lòng chọn menu tạo bài viết",
                    type: "error"
                })
            }
        });

        // click 
        // Nút btnCreateCategory tạo mới category
        $(document).on('click', '#btnCreateCategory', function (e) {
            e.preventDefault();

            let data = {
                name: $(`#${modalName.create_category}_name`).val(),
                status: $(`#${modalName.create_category}_status`).val(),
                idParent: $(`#modal_create_category_idParent`).val(),
                idRestaurant: $(`#modal_create_category_idRestaurant`).val(),
                weight: $(`#modal_create_category_weight`).val(),
                type: $(`#modal_create_category_type`).val(),
            }
            if (validateFormCustomize(modalName.create_category, data) === true) {
                let dataSend = Object.assign({}, data);
                _AjaxDataCustom("/restaurant-category", _options.method, JSON.stringify(dataSend), {
                    contentType: "application/json",
                }, function (resp) {
                    console.log({ resp })
                    _.isEqual(resp.code, 200) ? _.LoadPage(window.location.hash) : swal({ title: 'Thông báo !', text: resp.message, type: "error" });
                });
            } else {
                console.log("not validate");
            }

        });

        // click category-parent
        $(document).on('click', '.category-parent', handleEventClickCategoryMenu);
        // click category-child
        $(document).on('click', '.category-child', handleEventClickCategoryMenu);
        // click delete-news
        $(document).on('click', '.delete-news', handleEventClickDeleteNew);
        $(document).on('click', '.edit-news', e => {
            let target = $(e.currentTarget);
            let id = target.attr("data-id");
            // window.open(`/#news/${id}/edit`);
            window.location.hash = `news/${id}/edit`;
        });

        $(document).on('click', '.row-news', e => {
            let target = $(e.currentTarget);
            let id = target.attr("data-idCategory");
            console.log(id);
            $('.category-parent').removeClass("active");
            $('.category-child').removeClass("active");

            $(`#${id}`).addClass("active");
        });
        $(document).on('click', '.show-promotions', handleEventClickShowPromotions);

        function handleEventClickCategoryMenu(e) {
            e.stopPropagation();
            let target = $(e.currentTarget);

            $('.category-parent').removeClass("active");
            $('.category-child').removeClass("active");
            target.addClass("active");

            let tabActive = $(".menu-tab.active");
            let idType = tabActive.attr("data-id");
            let tabType = {
                "1": "menu",
                "2": "info",
                "3": "promotion"
            };
            if (!tabType[idType]) return;
            $(`#tblNew-${tabType[idType]} tbody`).html("");

            let params = {};
            params.scope = "search-by-category";
            params.idCategory = target.attr("id");

            _AjaxData('/news?' + $.param(params), 'GET', null, (resp) => {
                var title = '';
                var message = '';
                var type = '';
                if (resp.code == 500) {
                    title = 'Đã có lỗi xảy ra';
                    message = resp.message;
                    type = 'error';
                    swal({
                        title: title,
                        text: message,
                        type: type
                    });
                } else if (resp.code == 200) {
                    console.log(resp.message);
                    renderNewByCategory(tabType[idType], resp.message);
                }
            });
        }

        function handleEventClickDeleteNew(e) {
            e.stopPropagation();
            let target = $(e.currentTarget);
            console.log(target.attr("data-id"));

            swal({
                title: "Bạn muốn xoá mục này ?",
                text: "",
                type: "warning",
                showCancelButton: true,
                confirmButtonColor: "#DD6B55",
                confirmButtonText: "Có, chắc chắn !",
                closeOnConfirm: true
            }, function (ok) {
                console.log({ ok });
                if (ok === true) {
                    _AjaxData('/news/' + target.attr("data-id"), 'DELETE', {}, (resp) => {
                        console.log({ resp })
                        var title = '';
                        var message = '';
                        var type = '';
                        if (resp.code == 500) {
                            title = 'Đã có lỗi xảy ra';
                            message = resp.message;
                            type = 'error';
                            swal({
                                title: title,
                                text: message,
                                type: type
                            });
                        } else if (resp.code == 200) {
                            _.LoadPage(window.location.hash);
                        }
                    });
                }
            })


        }
        function handleEventClickShowPromotions(e) {
            e.stopPropagation();
            let target = $(e.currentTarget);

            window.location.hash = "promotions/show?dataID=" + target.attr("data-id");

        }
    };

    /**
     * Bắt sự kiện submit
     */
    var bindSubmit = function () {

    };

    /**
     * Hiển thị tên trường/cột theo file config
     */
    var bindValue = function () {
        _.each(_.allKeys(_config.MESSAGE.ARTICLE), function (item) {
            $('.' + item).html(_config.MESSAGE.ARTICLE[item]);
        });
    };

    var bindChange = function () {

        function handleEventChangeStatus(e, type) {
            e.preventDefault();
            let $this = $(e.currentTarget);
            let isChecked = $this.is(":checked");
            renderStatusBrand(type, isChecked);
        }

        // Nút changeStatus modal_create_category
        $(document).on('change', '#modal_create_category_status', e => handleEventChangeStatus(e, modalName.create_category));

        // Nút changeStatus modal_update_category
        $(document).on('change', '#modal_update_category_status', e => handleEventChangeStatus(e, modalName.update_category));

        // Nút change searchByName
        $(document).on('keyup', '#searchByName', handleEventKeyupSearchList);
        $(document).on('click', '#searchTitle', handleEventKeyupSearchList);

        // change Chọn khu vực modal tạo mới nhà hàng
        $(document).on('change', '#modal_create_restaurant_area', function (e) {
            e.preventDefault();
            var $this = $(this);
            let areaValue = $this.val();
            let params = {};
            params.scope = "search-by-area";
            params.typeArea = areaValue;

            _AjaxData('/provinces?' + $.param(params), 'GET', null, (resp) => {
                var title = '';
                var message = '';
                var type = '';
                if (resp.code == 500) {
                    title = 'Đã có lỗi xảy ra';
                    message = resp.message;
                    type = 'error';
                    swal({
                        title: title,
                        text: message,
                        type: type
                    });
                } else if (resp.code == 200) {
                    console.log(resp.message);
                    // renderProvinces(resp.message, "select", "create");
                }
            });
        });

        function handleEventKeyupSearchList(e) {
            console.log('hehe');
            

            e.preventDefault();
            const key = e.keyCode;
            let keySearch = $(e.currentTarget).val();

            if ((key >= 48 && key <= 105 || key === 8) && keySearch.length > 0) {
                delay(() => {
                    ajaxAlertInfoCustomerVininfo({ title: keySearch })
                }, 1000);
            }
            // swal({title: "Thông báo", text: "Chưa có dữ liệu tìm kiếm", type: "error"});

        }

        function ajaxAlertInfoCustomerVininfo(data) {
            let { title } = data

            let queryParams = {};

            let tabActive = $(".menu-tab.active");
            let idType = tabActive.attr("data-id");
            let idRestaurant = window.location.hash.replace("#restaurant-manager/", "");
            let tabType = {
                "1": "menu",
                "2": "info",
                "3": "promotion"
            };

            if (!idRestaurant) return swal({ title: 'Thông báo', text: 'Công ty không tồn tại', type: "error" });

            if (idType == "1" || idType == "2") {

                queryParams["type"] = idType;
                queryParams["scope"] = "search-by-title";
                queryParams["idRestaurant"] = idRestaurant;

                if (title) queryParams["title"] = title;

                _AjaxData('/news', 'GET', $.param(queryParams, true), function (resp) {
                    if (resp.code == 200 && resp.message && resp.message.length > 0) {
                        renderNewByCategory(tabType[idType], resp.message);
                    } else {
                        console.log(resp);
                        swal({ title: 'Thông báo', text: "Không tìm thấy dữ liệu", type: "error" });
                    }
                });
            } else {
                console.log('Search theo promotion');
                // swal({title: 'Search theo promotion', text: ""});
            }
        }

    };

    var bindModal = function () {

        /**
         * shown.bs.modal: bật phát ăn luôn
         * shown.bs.modal: đợi hết css mới ăn
         * hide.bs.modal: tắt phát ăn luôn
         * hidden.bs.modal: đợi hết css mới ăn
         */

        $('#modal_update_brand').on('shown.bs.modal', function () {

        });

        $('#modal_update_brand').on('hide.bs.modal', function () {
            $("#listBrand li").removeClass("active");
        });
    };

    function renderStatusBrand(modalName, status) {
        $(`#${modalName}_status`).val(status ? "on" : "off");
        return $(`#${modalName}_status_text`).html(status ? "Active" : "Not Active");
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
            console.log({ ele, val: fieldCheck.val() })
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

    function getIDCategoryActive(type) {
        let parentActive = $(`#tab-manager-${type} .category-parent.active`);
        let childActive = $(`#tab-manager-${type} .category-child.active`);
        if (parentActive.length > 0) return $(parentActive[0]).attr("id");
        if (childActive.length > 0) return $(childActive[0]).attr("id");
        return "";
    }

    function renderNewByCategory(type, data) {
        
        let countCol = $(`#tblNew-${type} thead th`).length;
        if (data.length === 0) return $(`#tblNew-${type} tbody`).html(`<tr> <td class='alert alert-danger text-center' colspan='${countCol}'> Không có dữ liệu </td> </tr>`)
        var fileType = ['xlsx', 'xls', 'docx', 'doc']
        var _url = function (f) {
            
            var extendfile = f.url.split('.').pop()
            var _tag = '';
            switch (fileType.indexOf(extendfile) == -1) {
                case false:
                    _tag = '' +
                        // '<a class="set-w flex-box-align c-red" href=#view-upload?idFile=' + f._id + ' target="_blank">' +
                        '<a class="set-w flex-box-align c-red" href=https://docs.google.com/viewer?embedded=true&url=' + _urlUpload + f.url + ' target="_blank">' +
                        '   <div style="width: 300px" class="f-13 overflow-hidden">' +
                        f.name +
                        '   </div>' +
                        '</a>';
                    break;
                case true:
                    if (extendfile == 'pdf') {
                        _tag = '' +
                            '<a class="set-w flex-box-align c-red" href=' + f.url + ' target="_blank">' +
                            '   <div style="width: 300px" class="f-13 overflow-hidden">' +
                            f.name +
                            '   </div>' +
                            '</a>';
                    } else {
                        _tag = '' +
                            '<a class="set-w flex-box-align c-red" href=' + f.url + ' download>' +
                            '   <div style="width: 300px" class="f-13 overflow-hidden">' +
                            f.name +
                            '   </div>' +
                            '</a>';
                    }
                    break;
            }
            return _tag;
        }
        $(`#tblNew-${type} tbody`).html(
            data.map((i, index) => {
                // console.log(i)
                // let fileNames = i.files.map(j => `<a href="${j.url}" download title="${j.name}">${j.name}</a>`).join("<br/>");
                let fileNames = i.files ? i.files.map(j => _url(j)): "";
                let htmlActions = `<i class="fa fa-pencil text-primary f-18 edit-news" data-id="${i._id}"></i>
                <i class="zmdi zmdi-close-circle text-danger f-18 delete-news" data-id="${i._id}"></i>`
                if (JSON.parse(isRoleAgent) == true) htmlActions = ``
                return `<tr class="row-news" data-idCategory='${i.idCategory._id || i.idCategory}'>` + [
                    `<td title="${i.title}">${i.title}</td>`,
                    `<td title="${i.content}">${i.content}</td>`,
                    `<td class="">${fileNames}</td>`,
                    `<td>${getTextByStatusNumber(i.status)}</td>`,
                    `<td class="text-center">
                        ${htmlActions}
                    </td>`,
                ].join("") + "</tr>"
            }).join("")
        )
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
            renderStatusBrand(modalName.create_brand, $("#modal_create_brand_status").is(":checked"));
            renderStatusBrand(modalName.create_restaurant, $("#modal_create_restaurant_status").is(":checked"));

        },
        uncut: function () {
            // xóa sự kiện khi rời trang hoặc load lại trang khi dùng _.LoadPage(window.location.hash)
            // nếu không, có thể sẽ bị load lại nhiều lần khi sử dụng trên trang này
            $(document).off('click', '#btn-search');
            $(document).off('change', '.select-box-all');
            $(document).off('change', '.select-box-cell');
            $(document).off('click', '#form-articles .pagination li a');
            $(document).off('click', '.btn-remove');
            $(document).off('click', '#btn-delSelection');
            $(document).off('click', '.sort');
            $(document).off('change', '#group-select');
            $(document).off('click', '#btnCreateCategory');
            $(document).off('change', '#modal_create_category_status');
            $(document).off('click', '.create-new-by-category');
            $(document).off('click', '.category-parent');
            $(document).off('click', '.category-child');
            $(document).off('click', '.add-menu');
            $(document).off('click', '.delete-news');
            $(document).off('click', '.edit-news');
            $(document).off('click', '.show-promotions');
            $(document).off('click', '#searchByName');

        }
    };
}(jQuery);