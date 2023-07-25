var DFT = function ($) {

    var _options = { id: '', url: '/news-manager', method: 'POST', data: {} };
    let modalName = {
        create_brand: "modal_create_brand",
        update_brand: "modal_update_brand",
        create_restaurant: "modal_create_restaurant",
        update_restaurant: "modal_update_restaurant",
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

        // click 
        // Nút createPromotion tạo mới CTKM
        $(document).on('click', '#createPromotion', function (e) {
            e.preventDefault();
            // window.open("/#promotions/new");
            window.location.hash = "promotions/new";

        })

        // Click Nhãn hiệu
        $(document).on('click', '#listBrand li', function (e) {
            e.preventDefault();
            var $this = $(this);

            $("#listBrand li").removeClass("active");
            $this.addClass("active");
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
                } else if(resp.code == 200) {
                    renderRestaurants(resp.message);
                }
            });
        });

        // Nút listRestaurant li --> redirect sang trang quản lý nhà hàng
        $(document).on('click', '.edit-promotions', function (e) {
            e.preventDefault();
            let target = $(e.currentTarget);
            let restaurantID = target.attr("data-id");
            if(!restaurantID) return swal({
                            title: "Thông báo!",
                            text: `Thất bại`, type: "error"
                        });
            window.location.hash = `promotions/${restaurantID}/edit`;
        });
        
        // Nút listRestaurant li --> redirect sang trang quản lý nhà hàng
        $(document).on('click', '.show-promotions', function (e) {
            e.stopPropagation();
            let target = $(e.currentTarget);
            let restaurantID = target.attr("data-id");
            if(!restaurantID) return swal({
                            title: "Thông báo!",
                            text: `Thất bại`, type: "error"
                        });
            window.open(`/#promotions/show?dataID=${restaurantID}`);
        });

        // Nút Sửa nhà nhà -> bật modal
        $(document).on('click', '#listRestaurant .edit', function (e) {
            e.stopPropagation();
            let target = $(e.currentTarget);
     
            if(!target.attr("dataJSON")) return swal({title: 'Thông báo !', text: "Không thể thực hiện", type: "error"});
            let dataJSON = JSON.parse(target.attr("dataJSON"));
            let modal = $(`#${modalName.update_restaurant}`);

            $("#listRestaurant li").removeClass("active");
            target.parent().addClass("active");

            modal.modal("show");
            $(`#${modalName.update_restaurant}_ID`).val(dataJSON._id);
            $(`#${modalName.update_restaurant}_name`).val(dataJSON.name);
            $(`#${modalName.update_restaurant}_code`).val(dataJSON.code);
            $(`#${modalName.update_restaurant}_idBrand`).val(dataJSON.idBrand._id);
            $(`#${modalName.update_restaurant}_area`).val(dataJSON.idProvince.typeArea);

            $(`#${modalName.update_restaurant}_idProvince`).html(
                [
                    "<option class='list-group-item' value='' selected>---- Chọn ----</option>",
                    `<option class='list-group-item' value='${dataJSON.idProvince._id}' selected>${dataJSON.idProvince.name}</option>`
                ].join("")
            );
            $(`#${modalName.update_restaurant}_status`).prop("checked", dataJSON.status === 1 ? true: false);
            renderStatusBrand(modalName.update_restaurant, dataJSON.status === 1 ? true: false);
        });

        // click delete-promotions
        $(document).on('click', '.delete-promotions', handleEventClickDeletePromotions);
        $(document).on('click', '#searchPromotion', handleEventClickSearchpromotions);

        function handleEventClickDeletePromotions(e) {
            e.stopPropagation();
            let target = $(e.currentTarget);
            let restaurantID = target.attr("data-id");
            if(!restaurantID) return swal({
                            title: "Thông báo!",
                            text: `Thất bại`, type: "error"
                        });

            swal({
                title: "Bạn muốn xoá mục này ?",
                text: "",
                type: "warning",
                showCancelButton: true,
                confirmButtonColor: "#DD6B55",
                confirmButtonText: "Có, chắc chắn !",
                closeOnConfirm: true
            }, function(ok) {
                console.log({ok});
                if(ok === true){
                    _AjaxData('/promotions/' + restaurantID, 'DELETE', {}, (resp) => {
                        console.log({resp})
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
            });
        }

        function handleEventClickSearchpromotions(e) {
            e.stopPropagation();
            let target = $(e.currentTarget);
            let keySearch = $("#searchByName").val();
            let idBrands = $("#news_support_idBrand").val();
            let typeArea = $("#news_support_area").val();
            let province = $("#news_support_idProvince");
            let promotionStatus = $("#promotion-status");
            // .val();
            let query = {
                title: keySearch,
            }
            
            if(idBrands) query.brand = idBrands.join(",");
            if(promotionStatus.val()) query.status = promotionStatus.val();

            if(typeArea){

                if(province.val()) query.province = province.val().join(",");

                else query.province = province.find("option").map((index, i) => $(i).val()).get().join(",");
            }
    
            console.log(query);
            ajaxSearchPromotions(query, "search-in-promotions-advanced");
        }

        function ajaxSearchPromotions(query, scope = "search-in-promotions-search-pagination") {
            let params = {};
            params.scope = scope;
            if(query.title) params.title = query.title;
            
            if(query.brand) params.brand = query.brand;
            if(query.province) params.province = query.province;
            if(query.restaurant) params.restaurant = query.restaurant;
            if(query.status) params.status = query.status;
            $("#tblPromotions tbody").html("");
            $('.pagination').remove();
            _AjaxData('/promotions-search?' + $.param(params), 'GET', null, (resp) => {
                var title = '';
                var message = '';
                var type = '';
                if (resp.code != 200) {
                    title = 'Đã có lỗi xảy ra';
                    message = resp.message;
                    type = 'error';
                    swal({
                        title: title,
                        text: message,
                        type: type
                    });
                } else if(resp.code == 200) {
                    renderPromotionsWithAggregate(resp.message, resp.paging);
                }
            });
        }
        
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

        // change Chọn khu vực modal tạo mới nhà hàng
        $(document).on('change', '#news_support_area', handleEventChangeAreas);
        $(document).on('change', '#news_support_idProvince', handleEventChangeIdProvince);
        $(document).on('change', '#news_support_idRestaurant', handleEventChangeIdRestaurant);

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
                } else if(resp.code == 200) {
                    console.log(resp.message);
                    renderProvinces(resp.message, "select", "update");
                }
            });
        });

        // $(document).on('keyup', '#searchByName', e => handleEventKeyupSearchList(e));

        function handleEventKeyupSearchList(e) {
            e.preventDefault();
            const key =  e.keyCode;
            let keySearch = $(e.currentTarget).val();

            if((key >= 48 && key <= 105 || key === 8)) {
                delay(() => {
                    let params = {};
                    params.scope = "search-in-promotions";
                    params.title = keySearch;
                    
                    $("#tblPromotions tbody").html("");
                    _AjaxData('/promotions-manager?' + $.param(params), 'GET', null, (resp) => {
                        var title = '';
                        var message = '';
                        var type = '';
                        if (resp.code != 200) {
                            title = 'Đã có lỗi xảy ra';
                            message = resp.message;
                            type = 'error';
                            swal({
                                title: title,
                                text: message,
                                type: type
                            });
                        } else if(resp.code == 200) {
                            renderPromotions(resp.message);
                        }
                    });

                }, 1000);
            }

        }

        function handleEventChangeAreas(e) {
            e.preventDefault();
            var $this = $(e.currentTarget);
            let areaValue = $this.val();
            let params = {};
            params.scope = "search-by-area";
            if(areaValue) params.typeArea = areaValue.join(",");
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
                } else if(resp.code == 200) {
                    renderProvinces(resp.message);
                }
            });
        }

        function handleEventChangeIdProvince(e) {
            e.preventDefault();
            var $this = $(e.currentTarget);
            let areaValue = $this.val();
            let params = {};
            params.scope = "search-in-promotions-new";
            if($("#news_support_idBrand").val()) params.idBrand = $("#news_support_idBrand").val().join(",");
            if($("#news_support_idProvince").val()) params.idProvince = $("#news_support_idProvince").val().join(",");

            console.log({idProvince:  params.idProvince})
            $("#listRestaurant").html("");
            _AjaxData('/restaurants?' + $.param(params), 'GET', null, (resp) => {
                var title = '';
                var message = '';
                var type = '';
                console.log({resp})
                if (resp.code == 500) {
                    title = 'Đã có lỗi xảy ra';
                    message = resp.message;
                    type = 'error';
                    swal({
                        title: title,
                        text: message,
                        type: type
                    });
                } else if(resp.code == 200) {
                    renderRestaurants(resp.message);
                }
            });
        }

        function handleEventChangeIdRestaurant(e) {
            e.preventDefault();
            $("#tblPromotions tbody").html("");

            var $this = $(e.currentTarget);
            let areaValue = $this.val();
            let params = {};
            params.scope = "search-in-promotions-manager";
            // params.idBrand = $("#news_support_idBrand").val()
            if(areaValue) params.idRestaurant = areaValue.join(",");
            else return;

            _AjaxData('/promotions-manager?' + $.param(params), 'GET', null, (resp) => {
                var title = '';
                var message = '';
                var type = '';
                if (resp.code != 200) {
                    title = 'Đã có lỗi xảy ra';
                    message = resp.message;
                    type = 'error';
                    swal({
                        title: title,
                        text: message,
                        type: type
                    });
                } else if(resp.code == 200) {
                    renderPromotions(resp.message);
                }
            });
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

    function renderProvinces(data) {
        let target = $(`#news_support_idProvince`);
        let htmlChildren = (province) => {

            let optionsHTML = `<option class="list-group-item" value="${province._id}">${province.name}</option>`;
            return  optionsHTML;
        }
        target.html(data.map(i => htmlChildren(i)).join(""));
        target.selectpicker('refresh');
    }

    function renderRestaurants(data) {
        let target = $("#news_support_idRestaurant");
        if(data.length === 0) return target.html(`<option value="">Không có dữ liệu</option>`)
        let htmlChildren = (_data) => {
            let liHTML = `<option class="list-group-item redirect-manager" value="${_data._id}">
                            <span>${_data.name}</span>
                            <i class="fa fa-pencil pull-right edit" dataJSON='${JSON.stringify(_data)}'></i>
                        </option>`;
            return  liHTML;
        }
        target.html(data.map(i => htmlChildren(i)).join(""));
        target.selectpicker('refresh');
    }

    function renderPromotions(data) {

        let countCol = $(`#tblPromotions thead th`).length;
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
        if(data.length === 0) return $(`#tblPromotions tbody`).html(`<tr> <td class='alert alert-danger text-center' colspan='${countCol}'> Không có dữ liệu </td> </tr>`)
        $(`#tblPromotions tbody`).html(
            data.map((i, index) => {
                i.idRestaurants = i.idRestaurants.map((j) => {
                    j.brandName = j.idBrand.name;
                    j.brandID = j.idBrand._id;
                    j.provinceName = j.idProvince.name;
                    j.provinceID = j.idProvince._id;
                    return j;
                });
        
                i.brands = Object.keys(_.countBy(i.idRestaurants, "brandName"));
                i.provinces = Object.keys(_.countBy(i.idRestaurants, "provinceName"));

                // let fileNames = i.files.map(j =>  `<a href="${j.url}" download title='${j.name}'>${j.name}</a>`).join("<br/>");
                let fileNames = i.files ? i.files.map(j => _url(j)): "";
                var startTime = moment(i.startTime).format('DD/MM/YYYY');
                var endTime = moment(i.endTime).format('DD/MM/YYYY');
                let btnActions = `<i class="fa fa-eye text-primary f-18 show-promotions" data-id="${i._id}"></i>`;
                if(isRoleAgent == "false") btnActions = `<i class="fa fa-pencil text-primary f-18 edit-promotions" data-id="${i._id}"></i>
                                    <i class="zmdi zmdi-close-circle text-danger f-18 delete-promotions" data-id="${i._id}"></i>`;
                                    
                return "<tr>" + [
                    `<td title="">${i.title}</td>`,
                    `<td > <div style="max-height:150px; overflow:hidden"> ${i.content}</div></td>`,
                    `<td >${fileNames}</td>`,
                    `<td class="text-center" title='${startTime}'>${startTime}</td>`,
                    `<td class="text-center" title='${endTime}'>${endTime}</td>`,
                    `<td title='${i.brands.join(",")}'>${i.brands.join("<br/>")}</td>`,
                    `<td class="text-center">${getTextByStatusNumber(i.status)}</td>`,
                    `<td class="text-center">
                        ${btnActions}
                    </td>`,
                ].join("") + "</tr>"
            }).join("")
        )
    }

    function renderStatusBrand(modalName, status) {
        $(`#${modalName}_status`).val(status ? "on": "off");
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
            console.log({ele, val: fieldCheck.val()})
            if(fieldCheck.hasClass("required")){
                
                if(fieldCheck.val() != "" ){
                    pass = true;
                    fieldValidate.removeClass("active");
                }else {
                    pass = false;
                    fieldValidate.addClass("active");
                    break;
                }
            }
        }
        
        return pass;
    }

    function renderPromotionsWithAggregate(data, paging) {

        let countCol = $(`#tblPromotions thead th`).length;
        if(data.length === 0)  {
            $('#paging').addClass("d-none");
            return $(`#tblPromotions tbody`).html(`<tr> <td class='alert alert-danger text-center' colspan='${countCol}'> Không có dữ liệu </td> </tr>`);
        }
        $('#paging').removeClass("d-none");
        $('#form-promotions-search .pagination').remove();
        $('#paging').append(_.paging('#promotions-manager', paging));
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

        $(`#tblPromotions tbody`).html(
            data.map((i, index) => {
                console.log(i);
                // i.idRestaurants = i.idRestaurants.map((j) => {
                //     j.brandName = j.idBrand.name;
                //     j.brandID = j.idBrand._id;
                //     j.provinceName = j.idProvince.name;
                //     j.provinceID = j.idProvince._id;
                //     return j;
                // });
        
                // i.brands = Object.keys(_.countBy(i.idRestaurants, "brandName"));
                // i.provinces = Object.keys(_.countBy(i.idRestaurants, "provinceName"));

                // let fileNames = i.fileObjects ? i.fileObjects.map(j =>  `<a href="${j.url}" download title='${j.name}'>${j.name}</a>`).join("<br/>"): "";
                let fileNames = i.fileObjects ? i.fileObjects.map(j => _url(j)): "";
                var startTime = moment(i.startTime).format('DD/MM/YYYY');
                var endTime = moment(i.endTime).format('DD/MM/YYYY');
                let btnActions = `<i class="fa fa-eye text-primary f-18 show-promotions" data-id="${i._id}"></i>`;
                if(isRoleAgent == "false") btnActions = `<i class="fa fa-pencil text-primary f-18 edit-promotions" data-id="${i._id}"></i>
                                    <i class="zmdi zmdi-close-circle text-danger f-18 delete-promotions" data-id="${i._id}"></i>`;
                                    
                return "<tr>" + [
                    `<td title="">${i.title}</td>`,
                    `<td > <div style="max-height:150px; overflow:hidden"> ${i.content}</div></td>`,
                    `<td >${fileNames}</td>`,
                    `<td class="text-center">${startTime}</td>`,
                    `<td class="text-center">${endTime}</td>`,
                    `<td >${_.uniq(i.brand).join("<br/>")}</td>`,
                    `<td class="text-center">${getTextByStatusNumber(i.status)}</td>`,
                    `<td class="text-center">
                        ${btnActions}
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
            // $.get(url, function (resp) {
            //     $('.page-loader').hide();
            //     refreshArticles(resp);
            // });

            $("#news_support_idBrand").selectpicker('refresh');
            $("#news_support_idProvince").selectpicker('refresh');
            $("#news_support_area").selectpicker('refresh');
            $("#news_support_idRestaurant").selectpicker('refresh');

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
            $(document).off('change', '#news_support_area');
            $(document).off('change', '#news_support_idProvince');
            $(document).off('change', '#news_support_idRestaurant');
            $(document).off('click', '#searchPromotion');
            $(document).off('click', '#createPromotion');
            $(document).off('click', '.edit-promotions');
            $(document).off('click', '.show-promotions');
            $(document).off('keyup', '#searchByName');
        }
    };
}(jQuery);