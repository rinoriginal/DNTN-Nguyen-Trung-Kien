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

    //Lấy dữ liệu lọc và truy vấn lên server
    var queryFilter = function (page) {

        var filter = _.chain($('.input'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) memo[el.name] = $(el).val();
                return memo;
            }, {}).value();

        if (page) {
            filter.page = page;
        }
        filter.scope = 'search-in-news-manager-pagination'

        _Ajax("/news-manager?" + $.param(filter), 'GET', {}, function (resp) {
            console.log(resp);

            //   if (resp.code == 200) {
            //     if (filter.isDownload == true) {
            //       downloadFromUrl(window.location.origin + resp.data)
            //     } else {
            //       $('#tbBody').empty();
            //       if (resp.data.length) {

            //         $('#sum').remove();
            //         $('#sumMoney').remove();

            //         loadData(resp);
            //         $('#paging').html(createPaging(resp.paging));
            //       } else {
            //         swal({
            //           title: "Thông báo",
            //           text: "Không tìm thấy các trường phù hợp",
            //           type: "warning",
            //           confirmButtonColor: "#DD6B55",
            //           confirmButtonText: "Xác nhận!",
            //           closeOnConfirm: true
            //         });
            //       }
            //     }
            //   } else {
            //     swal({ title: 'Cảnh báo !', text: resp.message });
            //   }
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
            } else if (resp.code == 200) {


                if (window.location.hash.includes("#news-manager")) {
                    renderNewsWithAggregate(resp.message, resp.paging);
                    $('#paging').html(createPaging(resp.paging));
                } else {
                    renderNewsWithAggregate(resp.message, resp.paging);
                    $('#paging').html(createPaging(resp.paging));
                }



            }
        })
    };

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
     * Bắt sự kiện click
     */
    var bindClick = function () {
        // Nút Lọc/Search
        $(document).on('click', '#btn-search', function (e) {
            queryFilter(false);
        });
        $(document).on('click', '#searchPromotion', function (e) {
            queryFilter(false);
        });
        $(document).on('click', '.pagination li a', function (e) {
            
            e.preventDefault();
            queryFilter($(this).attr('data-link'));
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
            console.log(target.attr("dataJSON"));
            if (!target.attr("dataJSON")) return swal({ title: 'Thông báo !', text: "Không thể thực hiện", type: "error" });
            let dataJSON = JSON.parse(target.attr("dataJSON"));
            let modal = $(`#${modalName.update_brand}`);
            $("#listBrand li").removeClass("active");
            target.parent().addClass("active");

            modal.modal("show");
            $(`#${modalName.update_brand}_ID`).val(dataJSON._id);
            $(`#${modalName.update_brand}_name`).val(dataJSON.name);
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

            if (!target.attr("dataJSON")) return swal({ title: 'Thông báo !', text: "Không thể thực hiện", type: "error" });
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
            $(`#${modalName.update_restaurant}_status`).prop("checked", dataJSON.status === 1 ? true : false);
            renderStatusBrand(modalName.update_restaurant, dataJSON.status === 1 ? true : false);
        });

        // Nút Sửa nhà nhà -> bật modal
        $(document).on('click', '#tblNews .edit-news', function (e) {
            let target = $(e.currentTarget);
            let id = target.attr("data-id");
            // window.open(`/#news/${id}/edit`);
            window.location.hash = `news/${id}/edit`;
        });

        // Nút show nhà nhà -> bật modal
        $(document).on('click', '#tblNews .show-news', function (e) {
            let target = $(e.currentTarget);
            let id = target.attr("data-id");
            // window.open(`/#news/show?dataID=${id}`);
            window.location.hash = `news/show?dataID=${id}`;
        });

        $(document).on('click', '#tblNews .delete-news', handleEventClickDeleteNew);
        $(document).on('click', '#btnSearchByName', handleEventClickSearchpromotions);
        // $(document).on('click', '#searchPromotion', handleEventClickSearchpromotions);

        function handleEventClickDeleteNew(e) {
            e.stopPropagation();
            let target = $(e.currentTarget);

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

        function handleEventClickSearchpromotions(e) {
            e.preventDefault();
            let keySearch = $("#searchByName").val();

            let params = {};
            let url = '/news-search?';
            let idBrands = $("#news_support_idBrand").val();
            let typeArea = $("#news_support_area").val();
            let province = $("#news_support_idProvince");
            let restaurant = $("#news_support_idRestaurant").val();

            if (idBrands) params.brand = idBrands.join(",");
            if (restaurant) params.restaurant = restaurant.join(",");

            if (typeArea) {

                if (province.val()) params.province = province.val().join(",");

                else params.province = province.find("option").map((index, i) => $(i).val()).get().join(",");
            }

            params.scope = "search-in-news-search-pagination";
            params.title = keySearch;

            if (window.location.hash.includes("#news-manager")) {
                params.scope = "search-in-news-manager-pagination";
                url = '/news-manager?';
            }
            $("#tblNews tbody").html("");
            $('.pagination').remove();
            _AjaxData(url + $.param(params), 'GET', null, (resp) => {
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
                } else if (resp.code == 200) {


                    if (window.location.hash.includes("#news-manager")) {
                        renderNewsWithAggregate(resp.message, resp.paging);
                    } else renderNewsWithAggregate(resp.message, resp.paging);



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
        // $(document).on('change', '#news_support_idRestaurant', handleEventChangeIdRestaurant);
        // $(document).on('keyup', '#searchByName', e => handleEventKeyupSearchList(e));

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

        function handleEventChangeAreas(e) {
            e.preventDefault();
            var $this = $(e.currentTarget);
            let areaValue = $this.val();
            let params = {};
            params.scope = "search-by-area";
            if (areaValue) params.typeArea = areaValue.join(",");
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
            if ($("#news_support_idBrand").val()) params.idBrand = $("#news_support_idBrand").val().join(",");
            if ($("#news_support_idProvince").val()) params.idProvince = $("#news_support_idProvince").val().join(",");

            console.log({ idProvince: params.idProvince })
            $("#listRestaurant").html("");
            _AjaxData('/restaurants?' + $.param(params), 'GET', null, (resp) => {
                var title = '';
                var message = '';
                var type = '';
                console.log({ resp })
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
        }

        function handleEventChangeIdRestaurant(e) {
            e.preventDefault();
            var $this = $(e.currentTarget);
            let areaValue = $this.val();
            let params = {};
            params.scope = "search-in-news-manager";
            // params.idBrand = $("#news_support_idBrand").val()
            if (areaValue) params.idRestaurant = areaValue.join(",");


            $("#listRestaurant").html("");
            _AjaxData('/news-manager?' + $.param(params), 'GET', null, (resp) => {
                var title = '';
                var message = '';
                var type = '';
                console.log({ resp })
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
                    renderNews(resp.message);
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
            return optionsHTML;
        }
        target.html(data.map(i => htmlChildren(i)).join(""));
        target.selectpicker('refresh');
    }

    function renderRestaurants(data) {
        let target = $("#news_support_idRestaurant");
        if (data.length === 0) return target.html(`<option value="">Không có dữ liệu</option>`)
        let htmlChildren = (_data) => {
            let liHTML = `<option class="list-group-item redirect-manager" value="${_data._id}">
                            <span>${_data.name}</span>
                            <i class="fa fa-pencil pull-right edit" dataJSON='${JSON.stringify(_data)}'></i>
                        </option>`;
            return liHTML;
        }
        target.html(data.map(i => htmlChildren(i)).join(""));
        target.selectpicker('refresh');
    }

    function renderNews(data) {

        let countCol = $(`#tblNews thead th`).length;
        if (data.length === 0) return $(`#tblNews tbody`).html(`<tr> <td class='alert alert-danger text-center' colspan='${countCol}'> Không có dữ liệu </td> </tr>`)
        $(`#tblNews tbody`).html(
            $.parseHTML(data.map((i, index) => {
                let fileNames = i.files.map(j => `<a href="${j.url}" download title="${j.name}">${j.name}</a>`).join("<br/>");

                var brandName = i.idCategory && i.idCategory.idRestaurant && i.idCategory.idRestaurant.idBrand ? i.idCategory.idRestaurant.idBrand.name : "";
                var provinceName = i.idCategory && i.idCategory.idRestaurant && i.idCategory.idRestaurant.idProvince ? i.idCategory.idRestaurant.idProvince.name : "";
                var typeArea = i.idCategory && i.idCategory.idRestaurant && i.idCategory.idRestaurant.idProvince ? i.idCategory.idRestaurant.idProvince.typeArea : "";
                var restaurantName = i.idCategory && i.idCategory.idRestaurant ? i.idCategory.idRestaurant.name : "";

                let btnActions = `<i class="fa fa-eye text-primary f-18 show-news" data-id="${i._id}"></i>`;
                if (isRoleAgent == "false") btnActions = `<i class="fa fa-pencil text-primary f-18 edit-news" data-id="${i._id}"></i>`;
                return "<tr>" + [
                    `<td title="${i.title}">${i.title}</td>`,
                    `<td >${i.content}</td>`,
                    `<td title="${brandName}">${brandName}</td>`,
                    `<td title="${typeArea}">${typeArea}</td>`,
                    `<td title="${provinceName}">${provinceName}</td>`,
                    `<td title="${restaurantName}">${restaurantName}</td>`,
                    `<td class="">${fileNames}</td>`,
                    `<td class="text-center">${btnActions}</td>`,
                ].join("") + "</tr>"
            }).join(""))
        )
    }

    function renderNewsWithAggregate(data, paging) {
        console.log(data, paging);
        let countCol = $(`#tblNews thead th`).length;
        if (data.length === 0) return $(`#tblNews tbody`).html(`<tr> <td class='alert alert-danger text-center' colspan='${countCol}'> Không có dữ liệu </td> </tr>`)

        $('#form-news-manager .pagination').remove();
        // $('#paging').append(_.paging('#news-manager', paging));

        $(`#tblNews tbody`).html(
            $.parseHTML(data.map((i, index) => {
                console.log(i);
                let fileNames = i.files.map(j => `<a href="${j.url}" download title="${j.name}">${j.name}</a>`).join("<br/>");

                var brandName = i.brand;
                var provinceName = i.province;
                var typeArea = i.typeArea;
                var restaurantName = i.restaurant;

                let btnActions = `<i class="fa fa-eye text-primary f-18 show-news" data-id="${i._id}"></i>`;
                if (isRoleAgent == "false") btnActions = `<i class="fa fa-pencil text-primary f-18 edit-news" data-id="${i._id}"></i>`;
                return "<tr>" + [
                    `<td title="${i.title}">${i.title}</td>`,
                    `<td >${i.content}</td>`,
                    `<td title="${brandName}">${brandName}</td>`,
                    `<td title="${typeArea}">${typeArea}</td>`,
                    `<td title="${provinceName}">${provinceName}</td>`,
                    `<td title="${restaurantName}">${restaurantName}</td>`,
                    `<td class="">${fileNames}</td>`,
                    `<td class="text-center">${btnActions}</td>`,
                ].join("") + "</tr>"
            }).join(""))
        )
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

    function createPaging(paging, classPaging) {
        console.log(paging);
    
        if (!paging) return '';
        var firstPage = paging.first ? '<li><a class="' + classPaging + '" data-link="' + paging.first + '">&laquo;</a></li>' : '';
        var prePage = paging.previous ? '<li><a class="' + classPaging + '" data-link="' + paging.previous + '">&lsaquo;</a></li>' : '';
        var pageNum = '';
        for (var i = 0; i < paging.range.length; i++) {
          if (paging.range[i] == paging.current) {
            pageNum += '<li class="active"><span>' + paging.range[i] + '</span></li>';
          } else {
            pageNum += '<li><a class="' + classPaging + '" data-link="' + paging.range[i] + '">' + paging.range[i] + '</a></li>';
          }
        }
        var pageNext = paging.next ? '<li><a class="' + classPaging + '" data-link="' + paging.next + '">&rsaquo;</a></li>' : '';
        var pageLast = paging.last ? '<li><a class="' + classPaging + '" data-link="' + paging.last + '">&raquo;</a></li>' : '';
        return '<div class="paginate text-center">' + '<ul class="pagination">' + firstPage + prePage + pageNum + pageNext + pageLast + '</ul></div>';
      };
    return {
        init: function () {
            queryFilter(false)
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
            $(document).off('click', '#form-news-manager .pagination li a');
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
            $(document).off('click', '#tblNews .edit-news');
            $(document).off('click', '#tblNews .show-news');
            $(document).off('click', '#tblNews .delete-news');
            $(document).off('keyup', '#searchByName');
            $(document).off('keyup', '#btnSearchByName');
            $(document).off('keyup', '#searchPromotion');
        }
    };
}(jQuery);