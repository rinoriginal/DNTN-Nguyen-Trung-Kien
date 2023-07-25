var DFT = function ($) {

    // Lấy dữ liệu tìm kiếm và truy vấn server
    var queryFilter = function () {
        var _data = $('#first-mail').serializeJSON();
        var listFilter = _.chain(_.keys(_data))
            .reduce(function (memo, item) {
                if (!_.isEqual(_data[item], ''))
                    memo[item.replace("filter_", "")] = _data[item];
                return memo;
            }, {})
            .value();

        var listSort = '';

        listSort = _.chain($('.listHead th').not('[data-sort="none"]'))
            .map(function (el) {
                return $(el).attr('data-field') ? $(el).attr('data-field') + ':' + $(el).attr('data-sort') : '';
            })
            .compact()
            .value();

        listSort = _.isEmpty(listSort) ? '' : '&sort=' + listSort[0];

        if (_.isUndefined(listFilter.fromDate) || _.isUndefined(listFilter.fromTime) || _.isUndefined(listFilter.toDate) || _.isUndefined(listFilter.toTime)) return;

        listFilter['from'] = listFilter.fromDate + ' ' + listFilter.fromTime;
        listFilter['to'] = listFilter.toDate + ' ' + listFilter.toTime;

        listFilter = _.omit(listFilter, 'fromDate fromTime toDate toTime'.split(' '));

        if (!moment(listFilter.from, 'DD/MM/YYYY HH:mm a').isBefore(moment(listFilter.to, 'DD/MM/YYYY HH:mm a'))) return;
        paging = _.has(window.location.obj, 'page') ? '&page=' + window.location.obj.page : '';
        window.location.hash = newUrl(window.location.hash.replace('#', ''), listFilter) + listSort + paging;
    };

    var bindClick = function () {
        // Reload lại trang
        $(document).on('click', '.zmdi-refresh', function () {
            _.LoadPage(window.location.hash);
        });

        // Click button Lọc/Tìm kiếm
        $(document).on('click', '.btn-filter', function () {
            queryFilter();
        });

        // Nhấn phím enter khi tìm kiếm
        $('#first-mail').on('keyup', function (e) {
            var keyCode = e.keyCode || e.which;
            if (keyCode === 13) {
                queryFilter();
            }
        });
    };

    var bindSubmit = function () {
        $('#first-mail').submit(function (e) {
            e.preventDefault();
        })
    };

    // Nhấn phím enter khi tìm kiếm
    var bindPressKey = function () {
        $('#search-bar').keypress(function (event) {
            var key = event.which;
            if (key == 13) {
                var searchValue = $('#search-bar').val();
                if (searchValue !== '') {
                    window.location.hash = '/first-mails/search?keyword=' + searchValue;
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

            _.each($.deparam(window.location.hash.split('?')[1] || ''), function (v, k) {
                var el = $('#filter_' + k);
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
                if(k === 'from'){
                    var f = v.split(' ');
                    $('#filter_fromDate').val(f[0]);
                    $('#filter_fromTime').val(f[1] + ' ' + f[2]);
                }
                if(k === 'to'){
                    var t = v.split(' ');
                    $('#filter_toDate').val(t[0]);
                    $('#filter_toTime').val(t[1] + ' ' + t[2]);
                }
            });
            // Thông báo nếu không tìm thấy kết quả tìm kiếm
            // if ($('#first-mail tbody tr').length == 1) {
            //     delete window.location.obj['sort'];
            //     if (!_.isEmpty(window.location.obj)) {
            //         swal({
            //             title: _config.MESSAGE.GROUP_PROFILE.SEARCH_TITLE,
            //             type: "warning"
            //         }, function () {
            //             window.history.back();
            //         });
            //     }
            // }

            // Hiển thị dữ liệu phân trang
            if ($('.pagination')[0]) {
                delete window.location.obj.page;
                var _url = $.param(window.location.obj);
                $('.pagination a').each(function (i, v) {
                    $(v).attr('href', $(v).attr('href') + '&' + _url);
                });
            }

            $('.multi-date-picker').datepicker({
                multidate: 0,
                multidateSeparator: ' - ',
                format: 'dd/mm/yyyy'
            });

            $('#time-picker').datetimepicker({
                format: 'LT'
            });

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
            $(document).off('click', '.listHead th');
            $(document).off('click', '.zmdi-refresh');
            $('#first-mail').unbind('keyup');
        }
    };
}(jQuery);