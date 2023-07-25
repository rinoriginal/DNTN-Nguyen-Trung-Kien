/* { author: haivh } */
var DFT = function ($) {

    var body = document.querySelector("#container");
    /**
     * Bắt sự kiện click
     */
    var bindClick = function () {
        // Nút download file template mẫu
        $(document).on('click', '#download-excel', function () {
            window.open($(this).attr('data-url'));
        });

        // Click nút Lọc/Search
        $(document).on('click', '#searchUserRestaurant', function () {
            queryFilterUserRestaurant(true);
        });

        //click add user
        $(document).on('click', '#btn-add-user', function () {
            html_add_user()
            $('#btnSaveAdd').removeAttr('data-id');
            $('#btnSaveAdd').removeAttr('data-agent');
            renderOption(_brands, '#brandModal')
            renderOption(_agent, '#agentModal')
        });
        //click edit user
        $(document).on('click', '.btn-edit-user', function () {
            let _id = $(this).attr('id')
            let _idBrand = $(this).attr('data-brand')
            let _idProvince = $(this).attr('data-province')
            _Ajax("/user-restaurant/" + _id + '/edit?idBrand=' + _idBrand + '&idProvince=' + _idProvince, 'GET', {}, function (resp) {
                let idBrand = resp.detail.idRestaurant.idBrand;
                let idProvince = resp.detail.idRestaurant.idProvince;
                let idRestaurant = resp.detail.idRestaurant._id;
                let _restaurant = resp.restaurants;
                let _idAgent = resp.detail.idAgent;

                html_edit_user();
                $('#btnSaveAdd').attr('data-id', _id);
                $('#btnSaveAdd').attr('data-agent', _idAgent);
                renderOptionEdit(_brands, '#brandModal', idBrand);
                renderOptionEdit(_provinces, '#provinceModal', idProvince);
                renderOptionEdit(_restaurant, '#restaurantModal', idRestaurant);
            })
        });

        //click delete user
        $(document).on('click', '.btn-delete-user', function () {
            var idUserRestaurant = $(this).attr('id')
            swal({
                title: 'Thông báo',
                text: 'Xác nhận xóa dữ liệu này?',
                type: "warning",
                showCancelButton: true,
                cancelButtonText: "Quay lại",
                confirmButtonColor: "#DD6B55",
                confirmButtonText: "Xác nhận",
                closeOnConfirm: true
            }, function () {
                _Ajax('/user-restaurant/' + idUserRestaurant, 'DELETE', '', function (res) {
                    // _Ajax('/user-restaurant', 'POST', [{ data: JSON.stringify(formData) }], function (res) {
                    if (res.code == 200) {
                        swal({
                            title: 'Xóa thành công',
                            text: '',
                            type: "success",
                            confirmButtonColor: "#DD6B55",
                            confirmButtonText: "Xác nhận",
                            closeOnConfirm: true
                        }, function () {
                            queryFilterUserRestaurant(false)
                        });
                    } else {
                        swal({
                            title: 'Đã có lỗi xảy ra',
                            text: resp.message,
                            type: "error",
                            confirmButtonColor: "#DD6B55",
                            confirmButtonText: "Quay lại!",
                            closeOnConfirm: true
                        });
                    }

                })
            });
        });

        //click chọn nhãn hiệu 
        $(document).on('change', '#idBrand', function () {
            renderOption(_provinces, '#idProvince')
        });

        //click chọn tỉnh thành 
        $(document).on('change', '#idProvince', function () {
            let params = {};
            params.idBrand = $("#idBrand").val();
            params.idProvince = $(this).val();
            params.modal = true;
            _AjaxData('/user-restaurant?' + $.param(params), 'GET', null, (resp) => {
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
                    renderOption(resp.message, '#idRestaurant')
                }
            });
        });


        //click chọn nhãn hiệu modal
        $(document).on('change', '#brandModal', function () {
            renderOption(_provinces, '#provinceModal')
        });

        //click chọn tỉnh thành modal
        $(document).on('change', '#provinceModal', function () {
            let params = {};
            params.idBrand = $("#brandModal").val();
            params.idProvince = $(this).val();
            params.modal = true;
            _AjaxData('/user-restaurant?' + $.param(params), 'GET', null, (resp) => {
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
                    renderOption(resp.message, '#restaurantModal')
                }
            });
        });


        // Load lại trang
        $(document).on('click', '.zmdi-refresh', function () {
            _.LoadPage(window.location.hash);
        });

        // chuyển trang
        $(document).on('click', '.pagination li a', function (e) {
            e.preventDefault();
            queryFilterUserRestaurant(false, $(this).attr('data-link'));
        });
    };

    //render data dropbox modal add user
    var renderOption = function (data, id) {
        var option = function (str) {
            let _str = '';
            if (str) {
                _.each(str, function (i) {
                    _str += '' +
                        '<option value = ' + i._id + '>' + (id == '#agentModal' ? i.displayName : i.name) + '</option>'
                })
            }
            return _str;
        }
        $(id).empty();
        $(id).append(option(data));
        $(id).selectpicker('refresh');
    }

    //render data dropbox modal edit user
    var renderOptionEdit = function (data, id, dataSelected) {
        var option = function (str) {
            let _str = '';
            if (str) {
                _.each(str, function (i) {
                    _str += '' +
                        '<option value = ' + i._id + (dataSelected == i._id ? ' selected' : "") + '>' + (id == '#agentModal' ? i.displayName : i.name) + '</option>'
                })
            }
            return _str;
        }
        $(id).empty();
        $(id).append(option(data));
        $(id).selectpicker('refresh');
    }

    // Lấy dữ liệu search và gửi lên server
    var queryFilterUserRestaurant = function (load, page) {
        var filter = _.chain($('.input'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) memo[el.name] = $(el).val();
                return memo;
            }, {}).value();
        var _page;
        if (page) {
            filter.page = page;
            _page = page;
        }

        if (load == true) {
            console.log(66666666, JSON.stringify(filter));

            _Ajax("/user-restaurant?" + $.param(filter), 'GET', {}, function (resp) {
                if (resp.code == 200) {
                    $('#tbBody').empty();
                    if (resp.data.length) {
                        console.log(99999, resp.data);

                        loadDataRestaurant(resp, _page);
                        $('#paging').html(createPaging(resp.paging));
                    } else {
                        swal({
                            title: "Thông báo",
                            text: "Không tìm thấy các trường phù hợp",
                            type: "warning",
                            confirmButtonColor: "#DD6B55",
                            confirmButtonText: "Xác nhận!",
                            closeOnConfirm: true
                        });
                    }
                } else {
                    swal({ title: 'Cảnh báo !', text: resp.message });
                }
            })
        }
        if (!load) {
            console.log(44444444444444444444444);

            _Ajax("/user-restaurant?" + $.param(filter), 'GET', {}, function (resp) {
                if (resp.code == 200) {
                    $('#tbBody').empty();
                    if (resp.data.length) {

                        loadDataRestaurant(resp, _page);
                        $('#paging').html(createPaging(resp.paging));
                    }
                }
            })
        }


    };

    //Tạo mới user
    var addUser = function () {
        $('#frm-add-user').validationEngine('attach', {
            validateNonVisibleFields: true, autoPositionUpdate: true,
            validationEventTrigger: 'keyup',
            onValidationComplete: function (form, status) {
                if (status) {
                    var formData = $(form).serializeJSON();
                    var idUserRestaurant = $('#btnSaveAdd').attr('data-id')
                    console.log(666666666, idUserRestaurant);

                    if (!idUserRestaurant) {//thêm mới
                        if ($('#brandModal').val() == undefined ||
                            $('#provinceModal').val() == undefined ||
                            $('#restaurantModal').val() == undefined ||
                            $('#agentModal').val() == undefined
                        ) {
                            swal({
                                title: 'Chú ý',
                                text: 'Bắt buộc điền thông tin vào mục có đánh dấu *',
                                type: "warning",
                                confirmButtonColor: "#DD6B55",
                                confirmButtonText: "Quay lại!",
                                closeOnConfirm: true
                            });
                        } else {
                            formData.agent = $('#agentModal').val();
                            _Ajax('/user-restaurant', 'POST', [{ data: JSON.stringify(formData) }], function (res) {
                                if (res.code == 200) {
                                    swal({
                                        title: 'Tạo mới thành công',
                                        text: '',
                                        type: "success",
                                        confirmButtonColor: "#DD6B55",
                                        confirmButtonText: "Xác nhận",
                                        closeOnConfirm: true
                                    }, function () {
                                        $('#userRestaurantPopup').modal('hide');
                                        queryFilterUserRestaurant(false)
                                    });
                                } else {
                                    swal({
                                        title: 'Đã có lỗi xảy ra',
                                        text: resp.message,
                                        type: "error",
                                        confirmButtonColor: "#DD6B55",
                                        confirmButtonText: "Quay lại!",
                                        closeOnConfirm: true
                                    });
                                }

                            })
                        }
                    } else { //edit
                        if ($('#brandModal').val() == undefined ||
                            $('#provinceModal').val() == undefined ||
                            $('#restaurantModal').val() == undefined
                        ) {
                            swal({
                                title: 'Chú ý',
                                text: 'Bắt buộc điền thông tin vào mục có đánh dấu *',
                                type: "warning",
                                confirmButtonColor: "#DD6B55",
                                confirmButtonText: "Quay lại!",
                                closeOnConfirm: true
                            });
                        } else {
                            console.log(99999);
                            formData.agent = $('#btnSaveAdd').attr('data-agent')
                            _Ajax('/user-restaurant/' + idUserRestaurant, 'PUT', [{ data: JSON.stringify(formData) }], function (res) {
                                // _Ajax('/user-restaurant', 'POST', [{ data: JSON.stringify(formData) }], function (res) {
                                if (res.code == 200) {
                                    swal({
                                        title: 'Cập nhật thành công',
                                        text: '',
                                        type: "success",
                                        confirmButtonColor: "#DD6B55",
                                        confirmButtonText: "Xác nhận",
                                        closeOnConfirm: true
                                    }, function () {
                                        $('#userRestaurantPopup').modal('hide');
                                        queryFilterUserRestaurant(false)
                                    });
                                } else {
                                    swal({
                                        title: 'Đã có lỗi xảy ra',
                                        text: resp.message,
                                        type: "error",
                                        confirmButtonColor: "#DD6B55",
                                        confirmButtonText: "Quay lại!",
                                        closeOnConfirm: true
                                    });
                                }

                            })
                        }
                    }




                }
            }
        })
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
    //hiển thị dữ liệu lên giao diện
    var loadDataRestaurant = function (resp, page) {
        let _stt = 1;
        if (page == undefined || page == 1) {
            _stt = 0 * 10 + 1
        } else {
            _stt = (Number(page) - 1) * 10 + 1;
        }

        var template = '<tr style="height:35px !important">' +
            '<td class="text-center" style="width:40px" title="{0}">{0}</td>' +
            '<td class="text-center" style="width:100px" title="{1}">{1}</td>' +
            '<td class="text-center" style="width:240px" title="{2}">{2}</td>' +
            '<td class="text-center" style="width:1px" title="{3}">{3}</td>' +
            '<td class="text-center" style="width:50px" title="{4}">{4}</td>' +
            '<td class="text-center" style="width:140px" title="{5}">{5}</td>' +
            '<td class="text-center" style="width:140px" title="{6}">{6}</td>' +
            '<td class="text-center">' +
            '   <p class="p-t-3 btn btn-flat-bg btn-edit-user text-center" data-target="#userRestaurantPopup" data-toggle="modal" data-placement="top" id="{7}" data-brand="{8}" data-province="{9}"><i class="zmdi zmdi-edit c-green f-17"></i></p>' +
            '   <p class="p-t-3 btn btn-flat-bg btn-delete-user" data-toggle="tooltip" data-placement="top" id="{10}"><i class="zmdi zmdi-delete c-green f-17"></i></p>' +
            '</td>' +
            '</tr>';

        var rows = '';

        resp.data.forEach(function (el, i) {
            if (_.isEmpty(el)) return;
            rows += template.str(
                _stt + i,
                (el.idAgent ? el.idAgent.name : ''),
                (el.idAgent ? el.idAgent.displayName : ''),
                (el.brand ? el.brand.name : ''),
                (el.province ? el.province.name : ''),
                (el.idRestaurant ? el.idRestaurant.name : ''),
                (el.created ? moment(el.created).format('DD/MM/YYYY') : ''),
                (el._id ? el._id : ''), (el.idRestaurant ? el.idRestaurant.idBrand : ''), (el.idRestaurant ? el.idRestaurant.idProvince : ''),
                (el._id ? el._id : ''),
            );
        })
        if (body){
            body.insertAdjacentHTML('afterend', `<div class="text-center total" id='sum' style="padding-top:10px;display:none"><b><span class="TXT_TOTAL">Tổng</span>:<span class="bold c-red" id="ticket-total">${resp.paging.totalResult}</span></b></div>`)
        }
        $('#tbBody').html(rows);
    };


    var html_add_user = function () {
        // console.log(777777, el);
        $('#urInfor').empty()
        let html = '';
        html += '' +
            '<div class="form-group col-md-12 m-b-20">' +
            '   <label for="group" class="col-sm-4 control-label">Nhãn hiệu<span class="required">*</span></label>' +
            '   <div class="p-0 col-sm-8">' +
            '       <div class="input-group col-md-6" style="width: 100%">' +
            '           <select name="brand" class="selectpicker input" title="-- Chọn --" id="brandModal" data-live-search="true">' +
            // optionBrands(_brands) +
            '           </select>' +
            '       </div>' +
            '   </div>' +
            '</div>' +
            '<div class="form-group col-md-12 m-b-20">' +
            '    <label for="group" class="col-sm-4 control-label">Tỉnh thành<span class="required">*</span></label>' +
            '    <div class="p-0 col-sm-8">' +
            '        <div class="input-group col-md-6" style="width: 100%">' +
            '            <select name="province" class="selectpicker input" title="-- Chọn --" id="provinceModal" data-live-search="true">' +
            // optionProvinces(provinces) +
            '            </select>' +
            '        </div>' +
            '    </div>' +
            '</div>' +
            '<div class="form-group col-md-12 m-b-20">' +
            '    <label for="group" class="col-sm-4 control-label">Nhà hàng<span class="required">*</span></label>' +
            '    <div class="p-0 col-sm-8">' +
            '        <div class="input-group col-md-6" style="width: 100%">' +
            '            <select name="restaurant" class="selectpicker input" title="-- Chọn --" id="restaurantModal" data-live-search="true">' +
            // '                <option>-- Chọn --</option>' +
            '            </select>' +
            '        </div>' +
            '    </div>' +
            '</div>' +
            '<div class="form-group col-md-12 m-b-20">' +
            '    <label for="group" class="col-sm-4 control-label">User<span class="required">*</span></label>' +
            '    <div class="p-0 col-sm-8">' +
            '        <div class="input-group col-md-6" style="width: 100%">' +
            '            <select name="agent" class="selectpicker input" title="-- Chọn --" id="agentModal" data-live-search="true" data-actions-box="true" multiple>' +
            // '              <option>-- Chọn --</option>' +
            '            </select>' +
            '        </div>' +
            '   </div>' +
            '</div>'
        // console.log(111111111111111111, tu_van_sau_cai);


        $('#urInfor').append(html)
        $('#provinceModal').selectpicker('refresh');
        $('#restaurantModal').selectpicker('refresh');
        // dateRefresh()
    }

    var html_edit_user = function () {
        // console.log(777777, el);
        $('#urInfor').empty()
        let html = '';
        html += '' +
            '<div class="form-group col-md-12 m-b-20">' +
            '   <label for="group" class="col-sm-4 control-label">Nhãn hiệu<span class="required">*</span></label>' +
            '   <div class="p-0 col-sm-8">' +
            '       <div class="input-group col-md-6" style="width: 100%">' +
            '           <select name="brand" class="selectpicker input" title="-- Chọn --" id="brandModal" data-live-search="true">' +
            // optionBrands(_brands) +
            '           </select>' +
            '       </div>' +
            '   </div>' +
            '</div>' +
            '<div class="form-group col-md-12 m-b-20">' +
            '    <label for="group" class="col-sm-4 control-label">Tỉnh thành<span class="required">*</span></label>' +
            '    <div class="p-0 col-sm-8">' +
            '        <div class="input-group col-md-6" style="width: 100%">' +
            '            <select name="province" class="selectpicker input" title="-- Chọn --" id="provinceModal" data-live-search="true">' +
            // optionProvinces(provinces) +
            '            </select>' +
            '        </div>' +
            '    </div>' +
            '</div>' +
            '<div class="form-group col-md-12 m-b-20">' +
            '    <label for="group" class="col-sm-4 control-label">Nhà hàng<span class="required">*</span></label>' +
            '    <div class="p-0 col-sm-8">' +
            '        <div class="input-group col-md-6" style="width: 100%">' +
            '            <select name="restaurant" class="selectpicker input" title="-- Chọn --" id="restaurantModal" data-live-search="true">' +
            // '                <option>-- Chọn --</option>' +
            '            </select>' +
            '        </div>' +
            '    </div>' +
            '</div>'
        // '<div class="form-group col-md-12 m-b-20">' +
        // '    <label for="group" class="col-sm-4 control-label">User<span class="required">*</span></label>' +
        // '    <div class="p-0 col-sm-8">' +
        // '        <div class="input-group col-md-6" style="width: 100%">' +
        // '            <select name="agent" class="selectpicker input" title="-- Chọn --" id="agentModal" data-live-search="true" data-actions-box="true" multiple>' +
        // // '              <option>-- Chọn --</option>' +
        // '            </select>' +
        // '        </div>' +
        // '   </div>' +
        // '</div>'
        // console.log(111111111111111111, tu_van_sau_cai);


        $('#urInfor').append(html)
        $('#restaurantModal').selectpicker('refresh');
        // dateRefresh()
    }

    return {
        init: function () {
            queryFilterUserRestaurant(false);
            bindClick();
            addUser()
            $('.container').attr('class', 'container-fluid m-b-10')

            window.onbeforeunload = null;
            $('.multi-date-picker').datepicker({
                multidate: 2,
                multidateSeparator: ' - ',
                format: 'dd/mm/yyyy'
            });
            $('.selectpicker').selectpicker('refresh');

        },
        uncut: function () {
            // xóa sự kiện khi rời trang
            $(document).off('click', '.sort');
            $(document).off('click', '#btn-search');
            $(document).off('click', '.zmdi-refresh');
            $(document).off('click', '.pagination li a');

            $(document).off('click', '.btn-edit');

        }
    };

}(jQuery);