

var DFT = function ($) {

    var filter = {};

    var requestFilter = function () {
        window.location.hash = newUrl(window.location.hash, filter);
    };

    function downloadExcelReport(url) {
        $('.page-loader').show();
        $.get(url, function (resp) {
            $('.page-loader').hide();

            if (resp.code == 500) {
                swal({
                    title: 'Đã có lỗi xảy ra',
                    text: resp.message,
                    type: "error"
                });
            } else {
                downloadFromUrl(window.location.origin + resp.message);
            }
        });
    };

    var bindClick = function () {

        $(document).on('click', '.zmdi-refresh', function () {
            _.LoadPage(window.location.hash);
        });

        $(document).on('change', '#filter-company', function () {
            if(!$(this).val()) {
                delete filter['company'];
                return;
            }
            filter['company'] = $(this).val();
        });

        $(document).on('change', '#filter-channel', function () {
            if(!$(this).val()) {
                delete filter['channel'];
                return;
            }
            filter['channel'] = $(this).val();
        });

        $(document).on('change', '#filter-agent', function () {
            if(!$(this).val()) {
                delete filter['agent'];
                return;
            }
            filter['agent'] = $(this).val();
        });

        $(document).on('dp.change', '#filter-startDate', function () {
            filter['startDate'] = $(this).val();
        });

        $(document).on('dp.change', '#filter-endDate', function () {
            filter['endDate'] = $(this).val();
        });

        $(document).on('click', '#filter-btn', function () {
            requestFilter();
        });

        $(document).on('click', '#download-excel', function(e) {
            e.stopPropagation();
            e.preventDefault();

            var _hash = window.location.hash.replace('#', '');
            var url = _hash + (_hash.indexOf('?') >= 0 ? '&' : '?')+ 'download-excel';
            downloadExcelReport(url);
        });
    }

    return {
        init: function () {

            // Thông báo khi không tìm thấy kết quả
            if (false && Object.keys(window.location.obj).length > 0) {
                swal({
                    title: _config.MESSAGE.TICKETREASON_TXT.SEARCH_NOT_FOUND_TITLE,
                    text: _config.MESSAGE.TICKETREASON_TXT.SEARCH_NOT_FOUND_TEXT,
                    type: "warning",
                    confirmButtonColor: "#DD6B55",
                    confirmButtonText: "Quay lại!",
                    closeOnConfirm: true
                }, function () {
                    window.history.back();
                });
            }
            // Hiển thị lại tiêu chí đã lọc
            _.each(window.location.obj, function (v, k) {
                var el = $('#filter-' + k.replace('[]', '').replace('.', '\\.'));
                if (el[0]) {
                    switch (el.prop('tagName')) {
                        case 'INPUT':
                            el.val(v);
                            break;
                        case 'SELECT':
                            var item = decodeURI(window.location).split("?")[1].split("&");
                            if(k.indexOf('[]') >= 0){
                                var array = [];
                                _.each(item, function (loop) {
                                    if (loop.split("=")[0] == k) {
                                        array.push(loop.split("=")[1]);
                                    }
                                });
                                v = array;
                            }
                            
                            if (el.is('.selectpicker')) {
                                el.val(v).selectpicker('refresh');
                            }
                            break;
                    }
                    filter[k.replace('[]', '')] = v;
                }
            });

            bindClick();
        },
        uncut: function () {
            // Disable sự kiện khi đóng trang
        }
    };
}(jQuery);
