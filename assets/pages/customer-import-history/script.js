var DFT = function ($) {

    var bindClick = function () {
        // CLick tìm kiếm dữ liệu
        $(document).on('click', '#btn-search', function(e){
            var query = '?created=' + $('#created').val();
            window.location.hash = 'customer-import-history' + query;
        });

        // Download file lịch sử import
        $(document).on('click', '#btn-download', function(e){
            var $this = this;
            window.open($($this).attr('data-url'));
        });
    };

    var bindSubmit = function () {

    };

    return {
        init: function () {
            bindClick();
            //sau khi xử lý search lưu lại các thông tin nếu page > 1
            if ($('.pagination')[0]) {
                delete window.location.obj.page;
                var _url = $.param(window.location.obj);
                $('.pagination a').each(function (i, v) {
                    $(v).attr('href', $(v).attr('href') + '&' + _url);
                });
            }
            bindSubmit();
        },
        uncut: function(){
            // Disable sự kiện khi đóng trang
            $(document).off('click', '#btn-search');
            $(document).off('click', '#btn-download');
        }
    };
}(jQuery);