/* { author: Thuận Boss } */
var DFT = function ($) {
    {
        var oUrl = window.location.hash.replace('#', '/');
        var controller = oUrl.indexOf('?') > 0 ? oUrl.substr(0, oUrl.indexOf('?')) : oUrl;
    }
    /**
     * Bắt sự kiện click
     */
    var bindClick = function () {
        // Sắp xếp dữ liệu
        $(document).on('click', '.sort', function () {
            var $this = $(this);
            switch ($this.attr('data-sort')) {
                case 'none':
                    $this.toggleAttr('data-sort', 'asc');
                    break;
                case 'asc':
                    $this.toggleAttr('data-sort', 'desc');
                    break;
                case 'desc':
                    $this.toggleAttr('data-sort', 'none');
                    break;
            }
            $this.siblings().toggleAttr('data-sort', 'none');
            queryFilter();
        });

        // Click nút Lọc/Search
        $(document).on('click', '#btn-search', function () {
            queryFilter();
        });

        // Nhấn enter khi search
        $(document).on('keyup', '#searchForm', function (e) {
            if (e.keyCode == 13) queryFilter();
        });

        //fix lỗi search 
        // $(document).on('click', '.pagination li a', function (e) {
        //     e.preventDefault();
        //     var page = !_.isNaN(parseInt($(this).data('page'))) ? parseInt($(this).data('page')) : 1;
        //     console.log('search: '+page);
        //     queryFilter(page);
        // });

        //Sự kiện thêm mới
        $(document).on('click', '#btn-create', function (e) {
            getDataAdd();
        });

        // Xóa phần tử hiện tại
        $(document).on('click', '.btn-remove', function () {
            var id = $(this).attr('data-id');
            swal({
                title: 'Xác nhận xóa',
                text: 'Bạn có chắc là xóa sản phẩm này trên hệ thống?',
                type: 'warning',
                showCancelButton: true,
                confirmButtonColor: "#DD6B55",
                confirmButtonText: "Có, chắc chắn!",
                closeOnConfirm: false
            },
                function () {
                    _AjaxObject(controller + '/' + id, 'DELETE', {}, function (resp) {
                        if (_.isEqual(resp.code, 200)) {
                            swal({
                                title: 'Thành công',
                                text: 'Sản phẩm đã được xóa thành công!',
                                type: 'success',
                                html: true
                            }, function () {
                                _.LoadPage(window.location.hash);
                            });
                        } else {
                            swal({ title: 'Thất bại!', text: resp.message });
                        }
                    });
                }
            );
        });

        //Sự kiện sửa
        $(document).on('click', '.btn-edit', function (e) {
            var _id = $(this).attr('data-id');
            getDataEdit(_id);
        });

        //Sự kiện submit
        // $(document).on('click', '#btn-modal-form-submit', function (e) {
        //     $('#modal-form-input').find('#form-modal-custom').submit();
        // });

        //Sự kiện đóng modal
        $('#modal-form-input').on('hidden.bs.modal', function (e) {
            setValueField($(this), [
                { fieldId: 'form-modal-type', value: '', type: 'input' },
                { fieldId: 'modal-form-input-label', value: '', type: 'text' },
                { fieldId: 'edit-nameAdvice', value: '', type: 'input' },
                { fieldId: 'edit-status', value: '', type: 'text' },
                { fieldId: 'adviceId', value: '', type: 'input' }
            ]);
        });

    };

    // Lấy dữ liệu search và gửi lên server
    var queryFilter = function (page) {
        var filter = _.chain($('.searchColumn')).reduce(function (memo, el) {
            if (!_.isEqual($(el).val(), '')) memo[el.name] = $(el).val();
            return memo;
        }, {}).value();

        var sort = _.chain($('thead tr th').not('[data-sort="none"]')).map(function (el) {
            return $(el).attr('sortName') ? $(el).attr('sortName') + ':' + $(el).attr('data-sort') : '';
        }).compact().value();

        sort = _.isEmpty(sort) || _.isEqual(sort.length, 0) ? '' : '&sort=' + sort[0];
        paging = page ? '&page=' + page : ''; //fix tim kiem
        window.location.hash = newUrl(window.location.hash, filter) + sort + paging;
    };

    /**
     * Bắt sự kiện submit
     */
    var bindSubmit = function () {

        $('#form-modal-custom').validationEngine('attach', {
            validateNonVisibleFields: true, autoPositionUpdate: true, validationEventTrigger: 'keyup',
            onValidationComplete: function (form, status) {

                var type = form.find('#form-modal-type').val();

                if (type == 'add') {
                    var url = controller;
                    var method = 'POST';
                } else if (type == 'edit') {
                    var id = form.find('#adviceId').val();
                    var url = controller + '/' + id;
                    var method = 'PUT';
                }

                if (status) {
                    var formData = $(form).getData();
                    _AjaxData(url, method, formData, function (resp) {
                        if (_.isEqual(resp.code, 200)) {
                            $('#modal-form-input').modal('hide');

                            swal({
                                title: 'Thông báo',
                                text: resp.message,
                                type: "success",
                                confirmButtonColor: "#74B23B",
                                closeOnConfirm: true
                            },
                                function () {
                                    _.LoadPage(window.location.hash);
                                });
                        } else {
                            swal({ title: 'Thông báo!', text: resp.message, type: "error" });
                        }
                    });
                }
            }
        });
    };

    /**
     * Hiển thị tên trường/cột theo file config
     */
    var bindValue = function () {
        var temp = [];
        _.each(_.allKeys(_config.MESSAGE.RESTA_TABLE), function (item) {
            var obj = $('.' + item);

            if (obj.prop('tagName')) {

                obj.html(_config.MESSAGE.RESTA_TABLE[item]);

                var index = obj.closest('th').index();
                temp[index] = '<li class="p-l-15 p-r-20"> ' +
                    '<div class="checkbox">' +
                    '<label> ' +
                    '<input type="checkbox" class="select-box column-display" data-index="' + index + '" checked>' +
                    '<i class="input-helper"></i>' +
                    '<a class="p-l-5 text-capitalize text-nowrap">' + _config.MESSAGE.RESTA_TABLE[item] + '</a>' +
                    '</label>' +
                    '</div>' +
                    '</li>';
            }
        });
        $('#showHideFields').append(temp.join(''));
    };

    //Lấy dữ liệu để thêm mới
    function getDataAdd() {
        setValueField($('#modal-form-input'), [
            { fieldId: 'form-modal-type', value: 'add', type: 'input' },
            { fieldId: 'modal-form-input-label', value: 'Thêm mới loại tư vấn', type: 'text' },
        ]);

        $('#modal-form-input').modal({
            backdrop: 'static',
            'keyboard': false
        });
    }

    //Lấy dữ liệu để chỉnh sửa
    function getDataEdit(_id) {
        console.log('_id', _id);
        _AjaxData('advice-categories/' + _id + '/edit', 'GET', $('#form-modal-custom').getData(), function (resp) {
            console.log('resp', resp);

            if (_.isEqual(resp.code, 200)) {
                setValueField($('#modal-form-input'), [
                    { fieldId: 'form-modal-type', value: 'edit', type: 'input' },
                    { fieldId: 'modal-form-input-label', value: 'Chỉnh sửa loại tư vấn', type: 'text' },
                    { fieldId: 'edit-nameAdvice', value: resp.data.nameAdvice, type: 'input' },
                    { fieldId: 'edit-status', value: resp.data.status, type: 'text' },
                    { fieldId: 'adviceId', value: resp.data._id, type: 'input' }
                ]);



                if (resp.data.status == 1) $("#edit-status").prop("checked", true);


                $('#modal-form-input').modal({
                    backdrop: 'static',
                    'keyboard': false
                });
            } else {
                swal({ title: 'Thông báo !', text: 'Có lỗi xảy ra!', type: "error" });
            }
        });
    }

    //set giá trị cho trường theo id
    function setValueField(el, data) {

        _.each(data, function (item) {

            switch (item.type) {
                case 'input':
                    el.find('#' + item.fieldId).val(item.value);
                    break;
                case 'text':
                    el.find('#' + item.fieldId).text(item.value);
                    break;
                case 'checkbox':
                    if (_.isEqual(item.value, 1)) {
                        el.find('#' + item.fieldId).prop('checked', true).trigger('change');
                    } else {
                        el.find('#' + item.fieldId).prop('checked', false);
                    }
                    break;
                case 'select':
                    $('#' + item.fieldId).empty();

                    _.each(item.value, function (o) {
                        var option = new Option(o.name, o._id, false);
                        $('#' + item.fieldId).append(option);

                    });
                    $('#' + item.fieldId).val(item.selected);
                    $('#' + item.fieldId).selectpicker('refresh');
                    break;
                case 'function':
                    item.value(item.fieldId, item.selected);
                    break;
            }
        });
    }

    return {
        init: function () {

            bindValue();
            bindClick();
            bindSubmit();

            // Hiển thị thông báo khi không tìm thấy kết quả
            if (isEmptyData && Object.keys(window.location.obj).length > 0) {
                delete window.location.obj['sort'];
                swal({
                    title: _config.MESSAGE.RESTA_TABLE.SEARCH_NOT_FOUND_TITLE,
                    text: _config.MESSAGE.RESTA_TABLE.SEARCH_NOT_FOUND_TEXT,
                    type: "warning",
                    confirmButtonColor: "#DD6B55",
                    confirmButtonText: "Quay lại!",
                    closeOnConfirm: true
                }, function () {
                    window.history.back();
                });
            };

            // Đổ dữ liệu vào searchInput
            _.each(window.location.obj, function (v, k) {
                var el = $('#filter-' + k.replace(['[]'], ''));
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

            $('.selectpicker').selectpicker('refresh');

            // Hiển thị dữ liệu sắp xếp
            if (_.has(window.location.obj, 'sort')) {
                var _sort = window.location.obj.sort.split(':');
                $('th[sortName="' + _sort[0] + '"]').attr('data-sort', _sort[1]);
            }

            window.onbeforeunload = null;
            $("#filter-fromDate, #filter-toDate").datetimepicker({
                format: "DD/MM/YYYY",
                locale: "vi",
                icons: {
                    time: "fa fa-clock-o",
                    date: "fa fa-calendar",
                    up: "fa fa-arrow-up",
                    down: "fa fa-arrow-down"
                },
                widgetPositioning: {
                    horizontal: "auto",
                    vertical: "bottom"
                }
            });

        },
        uncut: function () {
            // xóa sự kiện khi rời trang
            $(document).off('click', '.sort');
            $(document).off('click', '.btn-remove');
            $(document).off('click', '#btn-delSelection');
            $(document).off('change', '.select-box-all');
            $(document).off('change', '.select-box-cell');
            $(document).off('click', '#btn-search');
            $(document).off('click', '.zmdi-refresh');
            $(document).off('click', '.pagination li a');

            $('#restaDate').off('dp.change');
            $(document).off('click', '#btn-create');
            $(document).off('click', '.btn-edit');
            $(document).off('click', '#btn-modal-form-submit');
            $('#modal-form-input').off('hidden.bs.modal');
            $(document).off('change', '.update-status');

        }
    };

}(jQuery);