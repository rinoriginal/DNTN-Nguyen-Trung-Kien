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


        // Click nút Lọc/Search
        $(document).on('click', '#btnSearchByName', function () {
            queryFilter();
        });

        // Nhấn enter khi search
        $(document).on('keyup', '#searchForm', function (e) {
            if (e.keyCode == 13) queryFilter();
        });

        $(document).on('click', '.pagination li a', function (e) {
            e.preventDefault();
            queryFilter($(this).attr('data-link'));
        });

        $(document).on('click', '.delete-promotions', handleEventClickDeletePromotions);



    };
    function handleEventClickDeletePromotions(e) {
        e.stopPropagation();
        let target = $(e.currentTarget);
        let id = target.attr("data-id");
        if (!id) return swal({
            title: "Thông báo!",
            text: `Thất bại`, type: "error"
        });

        swal({
            title: "Xác nhận xóa bài viết ?",
            text: "",
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "Có, chắc chắn !",
            closeOnConfirm: true
        }, function (ok) {
            console.log({ ok });
            if (ok === true) {
                _AjaxData('/manage-major-document/' + id, 'DELETE', {}, (resp) => {
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
        });
    }

    // Lấy dữ liệu search và gửi lên server
    var queryFilter = function (page) {
        var filter = _.chain($('.input'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) memo[el.name] = $(el).val();
                return memo;
            }, {}).value();

        if (page) {
            filter.page = page;
        }
        console.log('filter', filter);


        _Ajax("/manage-major-document?" + $.param(filter), 'GET', {}, function (resp) {
console.log({resp});

            if (resp.code == 200) {
                $('#tbBody').empty();
                if (resp.data.length) {
                    loadData(resp);
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
    //hiển thị dữ liệu lên giao diện
    var loadData = function (resp) {
        var template = '<tr>' +
            '<td>{0}</td>' +
            '<td><div style="max-height:70px; overflow:hidden">{1}</div></td>' +
            '<td>{2}</td>' +
            '<td class="text-center">{3}</td>' +
            '</tr>';
        var rows = '';
        var fileType = ['xlsx', 'xls', 'docx', 'doc']
        var _url = function (f) {
            
            var extendfile = f.urlUpload.split('.').pop()
            var _tag = '';
            switch (fileType.indexOf(extendfile) == -1) {
                case false:
                    _tag = '' +
                        // '<a class="set-w flex-box-align c-red" href=#view-upload?idFile=' + f._id + ' target="_blank">' +
                        '<a class="set-w flex-box-align c-red" href=https://docs.google.com/viewer?embedded=true&url=' + _urlUpload + f.urlUpload + ' target="_blank">' +
                        '   <div style="width: 300px" class="f-13 overflow-hidden">' +
                        f.nameUpload +
                        '   </div>' +
                        '</a>';
                    break;
                case true:
                    if (extendfile == 'pdf') {
                        _tag = '' +
                            '<a class="set-w flex-box-align c-red" href=' + f.urlUpload + ' target="_blank">' +
                            '   <div style="width: 300px" class="f-13 overflow-hidden">' +
                            f.nameUpload +
                            '   </div>' +
                            '</a>';
                    } else {
                        _tag = '' +
                            '<a class="set-w flex-box-align c-red" href=' + f.urlUpload + ' download>' +
                            '   <div style="width: 300px" class="f-13 overflow-hidden">' +
                            f.nameUpload +
                            '   </div>' +
                            '</a>';
                    }
                    break;
            }
            return _tag;
        }
        resp.data.forEach(function (el) {
            var fileNames = el.files ? el.files.map(j => _url(j)): "";
            var action = resp.isRoleAgent ?
             ( `<a role="button" href="/#manage-major-document/${el._id}" class="p-t-3 btn-flat-bg btn-edit" data-original-title="Chi tiết"><i class="zmdi zmdi-eye text-primary f-18" style="color:#4da6ff"></i></a>`)
             : ( `<a role="button" href="/#manage-major-document/${el._id}/edit" class=" btn-flat-bg btn-edit"  data-original-title="Sửa"><i class="zmdi zmdi-edit text-info f-19" style="color:#4da6ff"></i></a>
             <i class="zmdi zmdi-close-circle text-danger f-18 delete-promotions"
                 data-id="${el._id}" style="color:#ff0000"></i>`)
            if (_.isEmpty(el)) return;
            rows += template.str(
                el.title,
                el.content ? el.content : '',
                fileNames,
                action
            );
        });
        $('#tblDocument tBody').html(rows);
    };

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

            bindValue();
            bindClick();
            queryFilter();
            // Hiển thị thông báo khi không tìm thấy kết quả
            // if (isEmptyData && Object.keys(window.location.obj).length > 0) {
            //     delete window.location.obj['sort'];
            //     swal({
            //         title: _config.MESSAGE.RESTA_TABLE.SEARCH_NOT_FOUND_TITLE,
            //         text: _config.MESSAGE.RESTA_TABLE.SEARCH_NOT_FOUND_TEXT,
            //         type: "warning",
            //         confirmButtonColor: "#DD6B55",
            //         confirmButtonText: "Quay lại!",
            //         closeOnConfirm: true
            //     }, function () {
            //         window.history.back();
            //     });
            // };



            $('.selectpicker').selectpicker('refresh');

            // Hiển thị dữ liệu sắp xếp
            if (_.has(window.location.obj, 'sort')) {
                var _sort = window.location.obj.sort.split(':');
                $('th[sortName="' + _sort[0] + '"]').attr('data-sort', _sort[1]);
            }

            window.onbeforeunload = null;
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