var DFT = function ($) {
    var _options = { id: '', url: '/brands', method: 'POST', data: {} };
    let modalName = {
        create_brand: "modal_create_brand",
        update_brand: "modal_update_brand",
        create_restaurant: "modal_create_restaurant",
        update_restaurant: "modal_update_restaurant",
    };
    var idBrand='';
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
     * làm mới danh sách articles
     * @param resp
     */
    var refreshArticles = function (resp) {
        $('#form-articles #tbl-articles tbody .articles').empty();
        $('#form-articles .pagination').remove();
        _.each(resp.data, function (tk, i) {
            $('#tbl-articles tbody').append(newArticle(tk));
        });
        $('#paging').append(_.paging('articles', resp.paging));

        setTimeout(function () {
            window.MainContent.loadTooltip();
        }, 1000);
    };

    /**
     * Tạo thẻ html của category
     * @param category
     * @returns {Array}
     */
    var newListCategory = function (category) {
        var lsHtml = [];
        _.each(category, function (obj, i) {
            lsHtml.push({ tag: 'span', content: obj.name });
        });
        return lsHtml;
    };

    /**
     * Tạo thẻ html hiển thị article
     * @param obj Dữ liệu article
     * @returns {*}
     */
    var newArticle = function (obj) {
        if (obj.category == null) obj.category = [];
        return _.Tags([
            {
                tag: 'tr', attr: { class: 'articles ' + obj.warning, 'data-id': obj._id, 'data-url': '/#articles' }, childs: [
                    {
                        tag: 'td', attr: { class: 'text-center' }, childs: [
                            {
                                tag: 'div', attr: { class: 'checkbox m-0' }, childs: [
                                    {
                                        tag: 'label', childs: [
                                            { tag: 'input', attr: { name: 'select', type: 'checkbox', class: "select-box select-box-cell", 'data-id': obj._id } },
                                            { tag: 'i', attr: { class: 'input-helper' } }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        tag: 'td', attr: { class: 'task text-center' }, childs: [
                            { tag: 'a', content: obj.title, attr: { href: '/#articles/' + obj._id } }
                        ]
                    },
                    {
                        tag: 'td', attr: { class: 'task text-justify' }, childs: [
                            { tag: 'a', content: obj.raw.length > 50 ? (obj.raw.substr(0, 50) + ' ... ') : obj.raw, attr: { href: '/#articles/' + obj._id } }
                        ]
                    },
                    {
                        tag: 'td', attr: { class: 'task text-center text-capitalize' }, childs: [
                            { tag: 'span', content: obj.category.length > 0 ? obj.category[0].group : '' }
                        ]
                    },
                    { tag: 'td', attr: { class: 'task text-center' }, childs: obj.category.length > 0 ? newListCategory(obj.category) : '' },
                    {
                        tag: 'td', attr: { class: 'text-center' }, childs: [
                            { tag: 'span', content: obj.author.displayName }
                        ]
                    },
                    {
                        tag: 'td', attr: { class: 'text-center' }, childs: [
                            { tag: 'span', content: obj.updater.displayName }
                        ]
                    },
                    {
                        tag: 'td', attr: { class: 'text-center' }, childs: [
                            { tag: 'span', content: moment(obj.updated).format('DD/MM/YYYY HH:mm:ss') }
                        ]
                    },
                    {
                        tag: 'td', attr: { class: 'text-center' }, childs: [
                            {
                                tag: 'a', attr: { class: 'p-t-3 btn-flat-bg', href: "/#articles/" + obj._id + '/edit', 'data-toggle': 'tooltip', 'data-placement': "top", 'data-original-title': "Sửa" }, childs: [
                                    { tag: 'i', attr: { class: "zmdi zmdi-edit green f-17" } }
                                ]
                            },
                            {
                                tag: 'a', attr: { class: 'btn-remove btn-flat-bg', role: 'button', 'data-toggle': 'tooltip', 'data-placement': "top", 'data-original-title': "Xóa", 'data-id': obj._id }, childs: [
                                    { tag: 'i', attr: { class: "zmdi zmdi-close red f-23" } }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]);
    };

    /**
     * Tạo dữ liệu option của thẻ selectpicker
     * @param obj
     * @returns {*}
     */
    var newOption = function (obj) {
        return _.Tags([
            { tag: 'option', attr: { class: 'option-g', value: obj._id }, content: obj.name }
        ]);
    };

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

        // Click dòng Khu Vực
        $(document).on('click', '#listArea li', function (e) {
            e.preventDefault();
            var $this = $(this);
            $('#listProvince').empty()
            $('#listRestaurant').empty()
            let areaValue = $this.attr("typeArea");
            let params = {};
            params.scope = "search-by-area-exist-restaurant";
            params.typeArea = areaValue;
            params.idBrand = idBrand

            $("#listArea li").removeClass("active");
            $this.addClass("active");

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
                } else {
                    renderProvinces(resp.message, "ul");
                }
            });
        });

        // click 
        // Nút btnCreateBrand tạo mới brand
        $(document).on('click', '#btnCreateBrand', function (e) {
            e.preventDefault();
            let name = $("#modal_create_brand_name").val();
            let status = $("#modal_create_brand_status").val();
            let data = {
                name,
                status
            }
            if (validateFormCustomize("modal_create_brand", data) === true) {
                _AjaxDataCustom(_options.url, _options.method, JSON.stringify(data), {
                    contentType: "application/json",
                }, function (resp) {
                    console.log({ resp })
                    _.isEqual(resp.code, 200) ? _.LoadPage(window.location.hash) : swal({ title: 'Thông báo !', text: resp.message, type: "error" });
                });
            } else {
                console.log("not validate");
            }

        });

        // Nút listBrand li
        $(document).on('click', '#listBrand .edit', function (e) {
            e.preventDefault();
            let target = $(e.currentTarget);
            console.log(decodeURIComponent(target.data("json")));
            if (!target.data("json")) return swal({ title: 'Thông báo !', text: "Không thể thực hiện", type: "error" });
            let dataJSON = JSON.parse(decodeURIComponent(target.data("json")));
            let modal = $(`#${modalName.update_brand}`);
            $("#listBrand li").removeClass("active");
            target.parent().addClass("active");

            modal.modal("show");
            $(`#${modalName.update_brand}_ID`).val(dataJSON._id);
            $(`#${modalName.update_brand}_name`).val(HtmlDecode(dataJSON.name));
            $(`#${modalName.update_brand}_status`).prop("checked", dataJSON.status === 1 ? true : false);
            renderStatusBrand(modalName.update_brand, dataJSON.status === 1 ? true : false);
        });


        // Nút btnUpdateBrand cập nhật brand
        $(document).on('click', '#btnUpdateBrand', function (e) {
            e.preventDefault();
            let modalID = $(`#${modalName.update_brand}_ID`).val();
            let name = $(`#${modalName.update_brand}_name`).val();
            let status = $(`#${modalName.update_brand}_status`).val();
            let data = {
                name,
                status
            }
            if (validateFormCustomize("modal_update_brand", data) === true) {
                _AjaxDataCustom(`${_options.url}/${modalID}`, "PUT", JSON.stringify(data), {
                    contentType: "application/json",
                }, function (resp) {
                    _.isEqual(resp.code, 200) ? _.LoadPage(window.location.hash) : swal({ title: 'Thông báo !', text: resp.message, type: "error" });
                });
            } else {
                console.log("not validate");
            }

        });

        // click 
        // Nút btnCreateRestaurant tạo mới restaurant
        $(document).on('click', '#btnCreateRestaurant', function (e) {
            e.preventDefault();

            let data = {
                name: $(`#${modalName.create_restaurant}_name`).val(),
                code: $(`#${modalName.create_restaurant}_code`).val(),
                idBrand: $(`#${modalName.create_restaurant}_idBrand`).val(),
                area: $(`#${modalName.create_restaurant}_area`).val(),
                idProvince: $(`#${modalName.create_restaurant}_idProvince`).val(),
                status: $(`#${modalName.create_restaurant}_status`).val(),
                tag: $(`#${modalName.create_restaurant}_tag`).val(),
            }
            if (validateFormCustomize(modalName.create_restaurant, data) === true) {
                let dataSend = Object.assign({}, data);
                delete dataSend.area;
                _AjaxDataCustom("/restaurants", _options.method, JSON.stringify(dataSend), {
                    contentType: "application/json",
                }, function (resp) {
                    console.log({ resp })
                    _.isEqual(resp.code, 200) ? swal({ title: 'Thông báo !', text: resp.message }, () => _.LoadPage(window.location.hash)) : swal({ title: 'Thông báo !', text: resp.message, type: "error" });
                });
            } else {
                console.log("not validate");
            }

        });

        // Nút btnUpdateRestaurant cập nhật restaurant
        $(document).on('click', '#btnUpdateRestaurant', function (e) {
            e.preventDefault();
            let modalID = $(`#${modalName.update_restaurant}_ID`).val();
            let data = {
                name: $(`#${modalName.update_restaurant}_name`).val(),
                code: $(`#${modalName.update_restaurant}_code`).val(),
                idBrand: $(`#${modalName.update_restaurant}_idBrand`).val(),
                area: $(`#${modalName.update_restaurant}_area`).val(),
                idProvince: $(`#${modalName.update_restaurant}_idProvince`).val(),
                status: $(`#${modalName.update_restaurant}_status`).val(),
                tag: $(`#${modalName.update_restaurant}_tag`).val(),
            }
            if (validateFormCustomize(modalName.update_restaurant, data) === true) {
                let dataSend = Object.assign({}, data);
                delete dataSend.area;
                // return console.log(dataSend);
                _AjaxDataCustom(`/restaurants/${modalID}`, "PUT", JSON.stringify(dataSend), {
                    contentType: "application/json",
                }, function (resp) {
                    console.log({ resp })
                    _.isEqual(resp.code, 200) ? _.LoadPage(window.location.hash) : swal({ title: 'Thông báo !', text: resp.message, type: "error" });
                });
            } else {
                console.log("not validate");
            }

        });

        // Click Nhãn hiệu
        $(document).on('click', '#listBrand li', function (e) {
            e.preventDefault();
            var $this = $(this);

            $("#listBrand li").removeClass("active");
            $this.addClass("active");
            $('#listArea').empty()
            $('#listProvince').empty()
            $('#listRestaurant').empty()
            idBrand = $(this).attr('id')

            _AjaxData('/brand-manager?idBrand=' + $(this).attr('id'), 'GET', null, (resp) => {
                console.log({ resp });

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
                } else if (resp.code == 200 && resp.message.length > 0) {
                    renderListArea(resp.message);
                }
            });
        });

        // Click tỉnh thành
        $(document).on('click', '#listProvince li', function (e) {
            e.preventDefault();
            var $this = $(this);
            let params = {};
            params.scope = "search-in-brand-manager";
            params.idBrand = $("#listBrand li.active").attr("id")
            params.idProvince = $this.attr("id");

            $("#listProvince li").removeClass("active");
            $this.addClass("active");
            
            $("#listRestaurant").html("");
            _AjaxData('/restaurants?' + $.param(params), 'GET', null, (resp) => {
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
                    renderRestaurants(resp.message);
                }
            });
        });

        // Nút listRestaurant li --> redirect sang trang quản lý nhà hàng
        $(document).on('click', '#listRestaurant .redirect-manager', function (e) {
            e.stopPropagation();
            let target = $(e.currentTarget);
            let restaurantID = target.attr("id");
            if (!restaurantID) return swal({
                title: "Thông báo!",
                text: `Thất bại`, type: "error"
            });
            window.open(`/#restaurant-manager/${restaurantID}`);
        });

        // Nút Sửa nhà nhà -> bật modal
        $(document).on('click', '#listRestaurant .edit', function (e) {
            e.stopPropagation();
            let target = $(e.currentTarget);

            if (!target.data("json")) return swal({ title: 'Thông báo !', text: "Không thể thực hiện", type: "error" });
            let dataJSON = JSON.parse(decodeURIComponent(target.data("json")));
            let modal = $(`#${modalName.update_restaurant}`);

            $("#listRestaurant li").removeClass("active");
            target.parent().addClass("active");

            modal.modal("show");
            $(`#${modalName.update_restaurant}_ID`).val(dataJSON._id);
            $(`#${modalName.update_restaurant}_name`).val(HtmlDecode(dataJSON.name));
            $(`#${modalName.update_restaurant}_code`).val(dataJSON.code);
            $(`#${modalName.update_restaurant}_idBrand`).val(dataJSON.idBrand._id);
            $(`#${modalName.update_restaurant}_area`).val(dataJSON.idProvince.typeArea);
            $(`#${modalName.update_restaurant}_tag`).val(dataJSON.tag);

            $(`#${modalName.update_restaurant}_idProvince`).html(
                [
                    "<option class='list-group-item' value='' selected>---- Chọn ----</option>",
                    `<option class='list-group-item' value='${dataJSON.idProvince._id}' selected>${dataJSON.idProvince.name}</option>`
                ].join("")
            );
            $(`#${modalName.update_restaurant}_status`).prop("checked", dataJSON.status === 1 ? true : false);
            renderStatusBrand(modalName.update_restaurant, dataJSON.status === 1 ? true : false);
        });
    };

    /**
     * Bắt sự kiện submit
     */
    var bindSubmit = function () {

        // $('#form-create-brand').validationEngine('attach', {
        //     validateNonVisibleFields: true,
        //     autoPositionUpdate: true,
        //     updatePromptsPosition: true,
        //     rules: {
        //         modal_name: {
        //             required: true,
        //             minlength: 8
        //         }
        //     },
        //     messages: {
        //         modal_name: {
        //             required: "Please provide your Login",
        //             minlength: "Your Login must be at least 8 characters"
        //         },
        //         pass: "Please provide your password"
        //     },
        //     // validationEventTrigger:'keyup',
        //     onValidationComplete: function (form, status) {
        //         if (status) {
        //             return console.log("CALL API")
        //             _AjaxData(_options.url + '/' + _options.id, _options.method, form.getData(), function (resp) {
        //                 _.isEqual(resp.code, 200) ? _.LoadPage(window.location.hash) : swal({title: 'Thông báo !', text: resp.message});
        //             });
        //         }else console.log("not call")
        //     }
        // });

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

        // Nút changeStatus modal_create_brand
        $(document).on('change', '#modal_create_brand_status', e => handleEventChangeStatus(e, modalName.create_brand));

        // Nút changeStatus modal_update_brand
        $(document).on('change', '#modal_update_brand_status', e => handleEventChangeStatus(e, modalName.update_brand));

        // Nút changeStatus modal_create_restaurant
        $(document).on('change', '#modal_create_restaurant_status', e => handleEventChangeStatus(e, modalName.create_restaurant));

        // Nút changeStatus modal_update_restaurant
        $(document).on('change', '#modal_update_restaurant_status', e => handleEventChangeStatus(e, modalName.update_restaurant));

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
                    renderProvinces(resp.message, "select", "create");
                }
            });
        });

        $(document).on('change', '#modal_update_restaurant_area', function (e) {
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
                    renderProvinces(resp.message, "select", "update");
                }
            });
        });

        // Nút change searchRestaurant
        $(document).on('keyup', '#searchRestaurant', e => handleEventKeyupSearchList(e, "Restaurant"));
        $(document).on('keyup', '#searchProvince', e => handleEventKeyupSearchList(e, "Province"));
        $(document).on('keyup', '#searchBrand', e => handleEventKeyupSearchList(e, "Brand"));

        function handleEventKeyupSearchList(e, type) {
            e.preventDefault();
            const key = e.keyCode;
            let keySearch = $(e.currentTarget).val().toLocaleLowerCase();
            let listSearch = $(`#list${type} .list-group-item`);

            if (listSearch.length > 0) {
                if ((key >= 48 && key <= 105 || key === 8) && keySearch.length > 0) {
                    delay(() => {

                        listSearch.each((index, i) => {
                            let target = $(i);
                            let name = target.find("span").html().toLocaleLowerCase();
                            if (!name.includes(keySearch)) target.addClass("d-none");
                            else target.removeClass("d-none");
                        })
                    }, 300);
                } else if (keySearch.length === 0) {
                    listSearch.removeClass("d-none");
                }
            } else {
                swal({ title: "Thông báo", text: "Chưa có dữ liệu tìm kiếm", type: "error" });
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

    function renderListArea(data) {
        $('#listArea').empty()
        data.forEach(function (item) {
            $('#listArea').append('<li class="list-group-item" typeArea="' + item.value + '"><span>' + item.name + '</span></li>')
        })
    }


    function renderProvinces(data, type, event) {
        let target = type === "ul" ? $("#listProvince") : $(`#modal_${event}_restaurant_idProvince`);
        let dataRender = [];
        let htmlChildren = (province) => {
            let liHTML = `<li class="list-group-item" id="${province._id}">
                            <span>${province.name}</span>
                        </li>`;

            let optionsHTML = `<option class="list-group-item" value="${province._id}">${province.name}</option>`;
            return type === "ul" ? liHTML : optionsHTML;
        }
        if (type == "select") {
            // dùng Object.assign ở đoạn này ko ăn :))) cùi vc
            dataRender = [`<option class='list-group-item' value='' selected>---- Chọn ----</option>`].concat(data.map(i => htmlChildren(i)));

        }
        else {
            dataRender = Object.assign([], data.map(i => htmlChildren(i)));
        }
        target.html(dataRender.join(""));
    }

    function renderRestaurants(data) {
        let target = $("#listRestaurant");
        if (data.length === 0) return target.html(`<div class='alert alert-danger'>Không có dữ liệu</div>`)
        let htmlChildren = (_data) => {
            let code = _data.code ? ` (${_data.code})` : " ";
            let tag = _data.tag ? ` <span class="text-danger">${_data.tag}</span>` : " ";
            let liHTML = `<li class="list-group-item redirect-manager ${classNameByStatus(_data.status)}" id="${_data._id}">
                            <span>${_data.name}${code}${tag}</span>
                            <i class="fa fa-pencil pull-right edit" data-json='${encodeURIComponent(JSON.stringify(_data))}'></i>
                        </li>`;
            return liHTML;
        }
        target.html(data.map(i => htmlChildren(i)).join(""));
    }

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
    return {
        init: function () {
            bindClick();
            bindSubmit();
            bindValue();
            bindChange();
            bindModal();
            // var url = '/brands' + (_.has(window.location.obj, 'page') ? ('?page=' + window.location.obj['page']) : '');
            // $('.page-loader').show();
            // $.get(url, function (resp) {
            //     $('.page-loader').hide();
            //     refreshArticles(resp);
            // });
            renderStatusBrand(modalName.create_brand, $("#modal_create_brand_status").is(":checked"));
            renderStatusBrand(modalName.create_restaurant, $("#modal_create_restaurant_status").is(":checked"));

        },
        uncut: function () {
            // xóa sự kiện khi rời trang hoặc load lại trang khi dùng _.LoadPage(window.location.hash)
            // nếu không, có thể sẽ bị load lại nhiều lần khi sử dụng trên trang này
            $(document).off('click', '#btn-search');
            $(document).off('change', '.select-box-all');
            $(document).off('change', '.select-box-cell');
            $(document).off('change', '#modal_create_brand_status');
            $(document).off('change', '#modal_update_brand_status');
            $(document).off('change', '#modal_create_restaurant_status');
            $(document).off('change', '#modal_update_restaurant_status');
            $(document).off('click', '#form-articles .pagination li a');
            $(document).off('click', '.btn-remove');
            $(document).off('click', '#btn-delSelection');
            $(document).off('click', '.sort');
            $(document).off('change', '#group-select');
            $(document).off('click', '#btnCreateBrand');
            $(document).off('click', '#btnUpdateBrand');
            $(document).off('click', '#listArea li');
            $(document).off('click', '#listBrand .edit');
            $(document).off('click', '#listBrand li');
            $(document).off('click', '#listProvince li');
            $(document).off('click', '#listRestaurant .edit');
            $(document).off('click', '#btnCreateRestaurant');
            $(document).off('click', '#btnUpdateRestaurant');
            $(document).off('click', '#listRestaurant .redirect-manager');
            $(document).off('keyup', '#searchRestaurant');
            $(document).off('keyup', '#searchProvince');
            $(document).off('keyup', '#searchBrand');
        }
    };
}(jQuery);