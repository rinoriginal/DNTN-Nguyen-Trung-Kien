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

        //click vào loại khiếu nại
        $('.complaint').on('click', function () {
            let _id = $(this).data('id');
            $('#setIdCategory').val(_id)
            $('.click-complaint').removeClass('click-complaint');
            $(this).addClass('click-complaint')
            _AjaxData('categories' + '/' + _id, 'GET', {}, function (resp) {
                if (_.isEqual(resp.code, 200)) {
                    renderProblem(resp.message)
                } else {
                    swal({ title: 'Thông báo !', text: 'Có lỗi xảy ra!', type: "error" });
                }
            });

        })

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
        // Click nút Lọc/Search
        $(document).on('click', '#btn-search-problem', function () {
            let _id = $('#setIdCategory').val()

            filterProblem(_id);
        });

        // Nhấn enter khi search
        $(document).on('keyup', '#searchForm', function (e) {
            if (e.keyCode == 13) queryFilter();
        });

        // Load lại trang
        $(document).on('click', '.zmdi-refresh', function () {
            _.LoadPage(window.location.hash);
        });

        // Thay đổi cột hiển thị báo cáo
        $(document).on('change', '.column-display', function (e) {
            var dataIndex = $(this).attr('data-index');
            var checked = $(this).is(":checked");

            _.each($('th'), function (el) {
                var index = $(el).index();

                if (index == dataIndex) {
                    if (checked) {
                        $(el).show();
                    } else {
                        $(el).hide();
                    }
                }
            });

            _.each($('td'), function (el) {
                var index = $(el).index();
                if (index == dataIndex) {
                    if (checked) {
                        $(el).show();
                    } else {
                        $(el).hide();
                    }
                }
            })
        });

        //fix lỗi search 
        // $(document).on('click', '.pagination li a', function (e) {
        //     e.preventDefault();
        //     var page = !_.isNaN(parseInt($(this).data('page'))) ? parseInt($(this).data('page')) : 1;
        //     console.log('search: ' + page);
        //     queryFilter(page);
        // });

        //Sự kiện thêm mới vấn đề
        $(document).on('click', '#btn-create-problem', function (e) {
            let _form = $(this).attr('data-form')
            getDataAdd(_form);
        });
        //Sự kiện thêm với khiếu nại
        $(document).on('click', '#btn-create-complaint', function (e) {
            let _form = $(this).attr('data-form')
            getDataAdd(_form);
        });
        $(document).on('click', '.btn-create', function (e) {
            let _form = $(this).attr('data-form')
            getDataAdd(_form);
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
            let _form = $(this).attr('data-form')
            getDataEdit(_form, _id);
        });

        // Sự kiện submit
        // $(document).on('click', '#btn-modal-form-complaint-submit', function (e) {
        //     $('#modal-form-input-complaint').find('#form-modal-complaint-custom').submit();
        // });
        // $(document).on('click', '#btn-modal-form-problem-submit', function (e) {
        //     $('#modal-form-input-problem').find('#form-modal-problem-custom').submit();
        // });

        //Sự kiện đóng modal complaint
        $('#modal-form-input-complaint').on('hidden.bs.modal', function (e) {
            setValueField($(this), [
                { fieldId: 'form-modal-complaint-type', value: '', type: 'input' },
                { fieldId: 'modal-form-input-complaint-label', value: '', type: 'text' },
                { fieldId: 'edit-category', value: '', type: 'input' },
                { fieldId: 'edit-SLA_THELOAI', value: '', type: 'input' },
                { fieldId: 'categoryId', value: '', type: 'input' },
                { fieldId: 'form-modal-complaint-name', value: '', type: 'input' }
            ]);
        });
        //Sự kiện đóng modal vấn đề
        $('#modal-form-input-problem').on('hidden.bs.modal', function (e) {
            setValueField($(this), [
                { fieldId: 'form-modal-problem-type', value: '', type: 'input' },
                { fieldId: 'modal-form-input-problem-label', value: '', type: 'text' },
                { fieldId: 'edit-subCategory', value: '', type: 'input' },
                { fieldId: 'edit-SLA_VANDE', value: '', type: 'input' },
                { fieldId: 'form-modal-problem-name', value: '', type: 'input' },
                { fieldId: 'subCategoryId', value: '', type: 'input' },
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

    //lấy dữ liệu search của problem
    var filterProblem = function (id) {
        var filter = _.chain($('.searchColumn')).reduce(function (memo, el) {
            if (!_.isEqual($(el).val(), '')) memo[el.name] = $(el).val();
            return memo;
        }, {}).value();

        filter.id = id

        _AjaxData('categories?' + $.param(filter), 'GET', {}, function (resp) {

            if (_.isEqual(resp.code, 200) && resp.message && resp.message.length > 0) {
                renderProblem(resp.message)
            } else {
                swal({ title: 'Thông báo !', text: 'không tìm thấy loại vấn đề !', type: "error" });
            }
        });
    }

    /**
     * Bắt sự kiện submit
     */
    var bindSubmit = function () {

        $('#form-modal-complaint-custom').validationEngine('attach', {
            validateNonVisibleFields: true, autoPositionUpdate: true, validationEventTrigger: 'keyup',
            onValidationComplete: function (form, status) {

                var type = form.find('#form-modal-complaint-type').val();

                if (type == 'add') {
                    var url = 'categories';
                    var method = 'POST';
                } else if (type == 'edit') {
                    var id = form.find('#categoryId').val();
                    var url = 'categories/' + id;
                    var method = 'PUT';

                }

                if (status) {
                    var formData = $(form).getData();

                    _AjaxData(url, method, formData, function (resp) {
                        if (_.isEqual(resp.code, 200)) {
                            $('#modal-form-input-complaint').modal('hide');
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
        $('#form-modal-problem-custom').validationEngine('attach', {
            validateNonVisibleFields: true, autoPositionUpdate: true, validationEventTrigger: 'keyup',
            onValidationComplete: function (form, status) {

                var type = form.find('#form-modal-problem-type').val();

                if (type == 'add') {
                    var url = 'sub-categories';
                    var method = 'POST';
                } else if (type == 'edit') {
                    var id = form.find('#subCategoryId').val();
                    var url = 'sub-categories/' + id;
                    var method = 'PUT';
                }

                if (status) {
                    var formData = $(form).getData();

                    _AjaxData(url, method, formData, function (resp) {

                        if (_.isEqual(resp.code, 200)) {
                            $('#modal-form-input-problem').modal('hide');
                            $(document).off('click', '#btn-create-problem');
                            swal({
                                title: 'Thông báo',
                                text: resp.message,
                                type: "success",
                                confirmButtonColor: "#74B23B",
                                closeOnConfirm: true
                            },
                                function () {
                                        filterProblem(resp.data.idCategory)
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

    //render dữ liệu vào bảng vấn đề
    function renderProblem(data) {
        let row = ''
        data.forEach(function (item) {
            row += `<tr>`;
            row += `<td class="text-center"> <span title="` + (item.subCategory ? item.subCategory : '') + ` ">` + (item.subCategory ? item.subCategory : '') + `</span> </td>` +
                `<td class="text-center"> <span>` + (item.SLA_VANDE ? item.SLA_VANDE : '') + `</span> </td>` +
                `<td class="text-center"> <span>` + (item.status == 1 ? '<i class="fa fa-check text-success"></i>' : '') + `</span> </td>` +
                `<td class="text-center">` +
                `<a role="button" data-form="problem" data-id="` + item._id + ` " href="javascript:void(0)" class="p-t-3 btn-flat-bg btn-edit" data-toggle="tooltip" data-placement="top" data-original-title="Sửa"><i class="zmdi zmdi-edit c-green f-17"></i></a>` +
                `</td>`
            row += '</tr>';
        })
        $('#table-problem-content').html(row)
    }

    //Lấy dữ liệu để thêm mới
    function getDataAdd(_form) {
        var label = ''
        if (_form == 'problem') {
            label = 'Thêm mới danh mục con'
        }
        else {
            label = 'Thêm mới danh mục '
        }
        setValueField($('#modal-form-input-' + _form), [
            { fieldId: 'form-modal-' + _form + '-type', value: 'add', type: 'input' },
            { fieldId: 'modal-form-input-' + _form + '-label', value: label, type: 'text' },
        ]);

        $('#modal-form-input-' + _form).modal({
            backdrop: 'static',
            'keyboard': false
        });
    }

    //Lấy dữ liệu để chỉnh sửa theo form
    function getDataEdit(_form, _id) {

        if (_form == 'complaint') {
            _AjaxData('categories/' + _id + '/edit', 'GET', $('#form-modal-custom').getData(), function (resp) {

                if (_.isEqual(resp.code, 200)) {
                    setValueField($('#modal-form-input-complaint'), [
                        { fieldId: 'form-modal-complaint-type', value: 'edit', type: 'input' },
                        { fieldId: 'modal-form-input-complaint-label', value: 'Chỉnh sửa loại khiếu nại', type: 'text' },
                        { fieldId: 'edit-category', value: resp.data.category, type: 'input' },
                        { fieldId: 'categoryId', value: resp.data._id, type: 'input' },
                        { fieldId: 'form-modal-complaint-name', value: _form, type: 'input' }
                    ]);

                    if (resp.data.status == 1) $("#edit-status").prop("checked", true);

                    $('#modal-form-input-complaint').modal({
                        backdrop: 'static',
                        'keyboard': false
                    });
                } else {
                    swal({ title: 'Thông báo !', text: 'Có lỗi xảy ra!', type: "error" });
                }
            });
        }
        if (_form == 'problem') {
            _AjaxData('sub-categories/' + _id + '/edit', 'GET', $('#form-modal-custom').getData(), function (resp) {
                if (_.isEqual(resp.code, 200)) {
                    setValueField($('#modal-form-input-problem'), [
                        { fieldId: 'form-modal-problem-type', value: 'edit', type: 'input' },
                        { fieldId: 'modal-form-input-problem-label', value: 'Chỉnh sửa loại vấn đề', type: 'text' },
                        { fieldId: 'edit-subCategory', value: resp.data.subCategory, type: 'input' },
                        { fieldId: 'edit-SLA_VANDE', value: resp.data.SLA_VANDE, type: 'input' },
                        { fieldId: 'edit-idCategory', value: data, selected: resp.data.idCategory, type: 'select' },
                        { fieldId: 'form-modal-problem-name', value: _form, type: 'input' },
                        { fieldId: 'subCategoryId', value: resp.data._id, type: 'input' },
                    ]);

                    if (resp.data.status == 1) $("#edit-status-problem").prop("checked", true);

                    $('#modal-form-input-problem').modal({
                        backdrop: 'static',
                        'keyboard': false
                    });
                } else {
                    swal({ title: 'Thông báo !', text: 'Có lỗi xảy ra!', type: "error" });
                }
            });
        }

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
                        var option = new Option(o.category, o._id, false);
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
                    title: 'Không tìm thấy kết quả',
                    text: 'Không có kết quả',
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
            $(document).off('click', '.complaint');
            $(document).off('click', '.sort');
            $(document).off('click', '.btn-remove');
            $(document).off('click', '#btn-delSelection');
            $(document).off('change', '.select-box-all');
            $(document).off('change', '.select-box-cell');
            $(document).off('click', '#btn-search');
            $(document).off('click', '.zmdi-refresh');
            $(document).off('click', '.pagination li a');

            $('#restaDate').off('dp.change');
            $(document).off('click', '.btn-create');
            $(document).off('click', '#btn-search-problem');
            $(document).off('click', '#btn-create-problem');
            $(document).off('click', '#btn-create-complaint');
            $(document).off('click', '.btn-edit');
            $(document).off('click', '#btn-modal-form-submit');
            $('#modal-form-input-complaint').off('hidden.bs.modal');
            $(document).off('change', '.update-status');

        }
    };

}(jQuery);