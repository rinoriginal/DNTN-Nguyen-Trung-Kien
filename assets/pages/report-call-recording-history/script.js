var DFT = function ($) {
    var url = 'https://crmdata.telehub.vn/downloads/'
    var bindClick = function () {
        // Click tìm kiếm
        $(document).on('click', '#btn-search', function () {
            queryFilter();
        });
         // Chọn chuyển trang
         $(document).on('click', '.zpaging', function () {
            queryFilter($(this).attr('data-link'));
        });
        // Tải lại trang
        $(document).on('click', '.zmdi-refresh', function(){
            _.LoadPage(window.location.hash);
        });
        // Nhấn phím Enter để tìm kiếm
        $(document).on('keyup', '#searchForm', function(e){
            if(e.keyCode == 13) queryFilter();
        });
    };
    // Lấy dữ liệu lọc và truy vấn server
    var queryFilter = function (page) {
        var filter = _.chain($('.searchColumn'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '')) memo[el.name] = $(el).val();
                return memo;
            }, {}).value();
        if (page) {
            filter.page = page;
        }
        _AjaxData('report-call-recording-history?' + $.param(filter), 'GET', {}, function (resp) {
            if(resp.code == 200){
                let html = '';
                resp.message.forEach((item, i) => {
                    html += `<tr>
                        <td class="text-center">${item.filepath || ''}</td>
                        <td class="text-center">${item.createdAt ? formatDate(item.createdAt) : ''}</td>
                        <td class="text-center">
                            <a href="${url + item.filepath}" download target="_blank">Download</a>
                        </td>
                    </tr>`
                    $('#recording-histories').html(html);
                    $('#count-total').html('<b>' +
                            '<span class="">Tổng</span>: ' +
                            '<span class="bold c-red" id="count-total">' + resp.paging.totalResult + '</span>' +
                            '</b>');
                    return $('#paging').html(createPaging(resp.paging));
                })
            }
            else{
                swal({ title: 'Thông báo!', text: resp.message, type: "warning" });
            }
        })
    };
    // Hiển thị dữ liệu phân trang
    var createPaging = function (paging) {
        if (!paging) return '';
        var firstPage = paging.first ? '<li><a class="zpaging" data-link="' + paging.first + '">&laquo;</a></li>' : '';
        var prePage = paging.previous ? '<li><a class="zpaging" data-link="' + paging.previous + '">&lsaquo;</a></li>' : '';
        var pageNum = '';
        for (var i = 0; i < paging.range.length; i++) {
            if (paging.range[i] == paging.current) {
                pageNum += '<li class="active"><span>' + paging.range[i] + '</span></li>';
            } else {
                pageNum += '<li><a class="zpaging" data-link="' + paging.range[i] + '">' + paging.range[i] + '</a></li>';
            }
        }
        var pageNext = paging.next ? '<li><a class="zpaging" data-link="' + paging.next + '">&rsaquo;</a></li>' : '';
        var pageLast = paging.last ? '<li><a class="zpaging" data-link="' + paging.last + '">&raquo;</a></li>' : '';
        return '<div class="paginate text-center">' + '<ul class="pagination">' + firstPage + prePage + pageNum + pageNext + pageLast + '</ul></div>';
    };
    function formatDate(data){
        return moment(data).format('DD/MM/YYYY HH:mm:ss')
    }
     // Hiển thị tên cột theo file config
     var bindTextValue = function(){
        _.each(_.allKeys(_config.MESSAGE.REPORT_CALL_MONITOR_HISTORIES), function(item){
            $('.' + item).html(_config.MESSAGE.REPORT_CALL_MONITOR_HISTORIES[item]);
        });
    }
    return {
        init: function () {
            bindClick();
            bindTextValue();
        },
        uncut: function(){
            // Disable sự kiện khi đóng trang
            $(document).off('click', '.zmdi-refresh');
            $(document).off('click','#btn-search');
            $(document).off('click','.zpaging')
        }
    };
  }(jQuery);