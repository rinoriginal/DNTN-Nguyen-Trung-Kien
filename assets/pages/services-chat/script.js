var DFT = function ($) {

    // Lấy dữ liệu tìm kiếm và truy vấn server
    var queryFilter = function () {
        var _data = $('#service').serializeJSON();
        var listFilter = _.chain(_.keys(_data))
            .reduce(function (memo, item) {
                if (!_.isEqual(_data[item], ''))
                    memo[item.replace("filter_", "")] = _data[item];
                return memo;
            }, {})
            .value();

        var listSort = '';
        listSort = _.chain($('thead tr th').not('[data-sort="none"]'))
            .map(function (el) {
                return $(el).attr('data-field') ? $(el).attr('data-field') + ':' + $(el).attr('data-sort') : '';
            })
            .compact()
            .value();
        listSort = _.isEmpty(listSort) ? '' : '&sort=' + listSort[0];
        paging = _.has(window.location.obj, 'page') ? '&page=' + window.location.obj.page : '';
        window.location.hash = newUrl(window.location.hash.replace('/', '').replace('#', ''), listFilter) + listSort + paging;
    };

    var newOption = function (obj) {
        return _.Tags([
            { tag: 'option', attr: { class: 'option-g', value: obj._id }, content: obj.name }
        ]);
    };

    var bindClick = function () {
        // Reload lại trang
        $(document).on('click', '.zmdi-refresh', function () {
            _.LoadPage(window.location.hash);
        });

        // Xóa phần tử hiện tại
        $(document).on('click', '.btn-remove', function () {
            var _id = $(this).attr('data-id');
            swal({
                title: _config.MESSAGE.SERVICES.DELETE_TITLE,
                text: _config.MESSAGE.SERVICES.DELETE_TEXT,
                type: "warning", showCancelButton: true, confirmButtonColor: "#DD6B55", confirmButtonText: "Có, chắc chắn !", closeOnConfirm: false
            },
                function () {
                    _AjaxObject('/services-chat/' + _id, 'DELETE', {}, function (resp) {
                        swal({ title: 'Thành công', text: _config.MESSAGE.SERVICES.DELETE_TEXT_SUCCESS, type: "success" }, function () {
                            _.LoadPage(window.location.hash);
                        });
                    });
                });
        });

        // Xóa các phần tử đã chọn
        $(document).on('click', '#btn-delSelection', function () {
            var ids = $.map($('.selection'), function (n, i) {
                return $(n).is(":checked") ? $(n).val() : '';
            });
            swal({
                title: _config.MESSAGE.SERVICES.DELETE_TITLE_MANY,
                text: _config.MESSAGE.SERVICES.DELETE_TEXT_MANY,
                type: "warning", showCancelButton: true, confirmButtonColor: "#DD6B55", confirmButtonText: "Có, chắc chắn !", closeOnConfirm: false
            },
                function () {
                    _Ajax('/services-chat/all', 'DELETE', [{ ids: _.compact(ids) }], function (resp) {
                        swal({ title: 'Thành công', text: _config.MESSAGE.SERVICES.DELETE_TEXT_SUCCESS, type: "success" }, function () {
                            _.LoadPage(window.location.hash);
                        });
                    });
                });
        });

        // Chọn tất cả
        $(document).on('click', '#select_all', function () {
            //$('#select_all').click(function(event) {
            if (this.checked) {
                // Iterate each checkbox
                $('.selection').each(function () {
                    this.checked = true;
                });
                $('#li-hidden').removeClass('hidden');
            }
            else {
                $('.selection').each(function () {
                    this.checked = false;
                });
                $('#li-hidden').addClass('hidden');
            }
        });

        // Chọn phần tử
        $(document).on('click', '.selection', function () {
            //$('.selection').click(function(event){
            var x = $.map($('.selection'), function (n, i) {
                return $(n).is(":checked");
            });
            if (_.compact(x).length > 0) {
                $('#li-hidden').removeClass('hidden');
            }
            else {
                $('#li-hidden').addClass('hidden');
            }
        })

        // Click button Lọc/Tìm kiếm
        $(document).on('click', '.btn-filter', function () {
            queryFilter();
        });

        // Sắp xếp dữ liệu
        $(document).on('click', '.table-fix th', function () {
            var $this = $(this);
            if (_.isUndefined($this.attr('data-field'))) return false;
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

        // Cập nhật lại channel khi thay đổi công ty
        $(document).on('change', '#filter_idCompany', function (e) {
            var $this = $(this);
            $('#filter_idChannel').empty().selectpicker('refresh');
            $('.option-g').remove();
            $('#filter_idChannel').append(newOption({ _id: 0, name: 'Tất cả' })).selectpicker('refresh');
            var url = (_.isEqual($this.find(":checked").val(), '0')) ? '/company-channel?status=1' : ('/company-channel?status=1&idCompany=' + $this.find(":checked").val());
            $.get(url, function (res) {
                _.each(res.channel, function (g, i) {
                    $('#filter_idChannel').append(newOption(g)).selectpicker('refresh');
                });
            });
        });
    };

    var bindSubmit = function () {

    };

    var bindPressKey = function () {
        // Nhấn phím enter khi tìm kiếm
        $('#search-bar').keypress(function (event) {
            var key = event.which;
            if (key == 13) {
                var searchValue = $('#search-bar').val();
                if (searchValue !== '') {
                    window.location.hash = 'services-chat/search?keyword=' + searchValue;
                }
            }
        });
    }

    return {
        init: function () {
            // Hiển thị dữ liệu sắp xếp
            if (_.has(window.location.obj, 'sort')) {
                var _sort = window.location.obj.sort.split(':');
                $('th[data-field="' + _sort[0] + '"]').attr('data-sort', _sort[1]);
            }

            // Thông báo nếu không tìm thấy kết quả tìm kiếm
            if ($('#service tbody tr').length == 1) {
                delete window.location.obj['sort'];
                if (!_.isEmpty(window.location.obj)) {
                    swal({ title: _config.MESSAGE.GROUP_PROFILE.SEARCH_TITLE, type: "warning" }, function () {
                        window.location.href = "/#services-chat"
                    });
                }
            }

            // Hiển thị dữ liệu phân trang
            if ($('.pagination')[0]) {
                delete window.location.obj.page;
                var _url = $.param(window.location.obj);
                $('.pagination a').each(function (i, v) {
                    $(v).attr('href', $(v).attr('href') + '&' + _url);
                });
            }

            // Cập nhật lại channel khi thay đổi công ty
            if (!_.isEqual($('#filter_idCompany').val(), '0')) {
                $('#filter_idChannel').empty().selectpicker('refresh');
                $('.option-g').remove();
                $('#filter_idChannel').append(newOption({ _id: 0, name: 'Tất cả' })).selectpicker('refresh');
                var url = '/company-channel?status=1&idCompany=' + $('#filter_idCompany').val();
                $.get(url, function (res) {
                    _.each(res.channel, function (g, i) {
                        $('#filter_idChannel').append(newOption(g)).selectpicker('refresh');
                    });
                });
            }

            bindClick();
            bindSubmit();
            bindPressKey();
        },
        uncut: function () {
            // Disable sự kiện khi đóng trang
            $(document).off('click', '.btn-remove');
            $(document).off('click', '#btn-delSelection');
            $(document).off('click', '#select_all');
            $(document).off('click', '.selection');
            $(document).off('click', '.btn-filter');
            $(document).off('click', '.table-fix th');
            $(document).off('change', '#filter_idCompany');
            $(document).off('click', '.zmdi-refresh');
        }
    };
}(jQuery);