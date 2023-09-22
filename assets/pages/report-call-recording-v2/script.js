var DFT = function ($) {
    var url = 'https://crmdemo1.telehub.vn/recordings/';
     // Hiển thị tên cột theo file config
     var bindTextValue = function(){
        _.each(_.allKeys(_config.MESSAGE.REPORT_CALL_MONITOR), function(item){
            $('.' + item).html(_config.MESSAGE.REPORT_CALL_MONITOR[item]);
        });
    }
  
    function bindClick() {
        // Load lại page
        $(document).on('click', '.zmdi-refresh', function () {
            _.LoadPage(window.location.hash);
        });
  
        // Lọc dữ liệu báo cáo
        $(document).on('click', '#btn-search', function () {
            queryFilter();
        });
  
        // Chuyển trang
        $(document).on('click', '.zpaging', function () {
            queryFilter($(this).attr('data-link'));
        });
  
        // Nhấn phím enter
        $(document).on('keyup', '.filter', function (e) {
            if (e.keyCode == 13) {
                queryFilter();
            }
        });
        // Download file báo cáo
        $(document).on('click', '#download-excel', function(){
            queryFilter(1,1);
        })
  
    };
  
    // Lấy dữ liệu lọc báo cáo và truy vấn server
    function queryFilter(page,download) {
        var filter = _.chain($('.searchColumn'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '')) memo[el.name] = $(el).val();
                return memo;
            }, {}).value();
        if (page) {
            filter.page = page;
        }
        if(download) {
            filter.download = download;
        }
        _AjaxData('report-call-recording-v2?' + $.param(filter), 'GET', {}, function (resp) {
            if(resp.code == 200){
                if(download){
                    swal({ title: 'Thông báo!', text: "Gửi yêu cầu thành công!"},function(){
                        window.location.href = '/#report-call-recording-history';
                    });
                }
                else{
                    let html = ''
                    resp.message.forEach(function(item,index){{
                        html+=`<tr>
                            <td class="text-center">${item.caller ? (item.caller == item.remoteParty ? "Gọi vào" : "Gọi ra")  : ''}</td>
                            <td class="text-center">${item.FirstName + item.LastName || ''}</td>
                            <td class="text-center">${item.localParty || ''}</td>
                            <td class="text-center">${item.remoteParty || ''}</td>
                            <td class="text-center">${item.timestamp ? moment(item.timestamp).format('DD/MM/YYYY') : ''}</td>
                            <td class="text-center">${item.timestamp ?  moment(item.timestamp).format('HH:mm:ss DD/MM/YYYY') : ''}</td>
                            <td class="text-center">${item.timestamp ?  moment(item.timestamp).add((item.duration || 0),'seconds').format('HH:mm:ss DD/MM/YYYY') : ''}</td>
                            <td class="text-center">${item.duration ? moment().startOf('day').seconds(Math.ceil(item.duration)).format('HH:mm:ss') : ''}</td>
                            <td>
                                <audio controls style="width: 210px; padding: 0">
                                    <source src="${url + item.filename}" type="audio/wav">
                                </audio>
                            </td>
                        </tr>`
                        $("#recording-detail").html(html);
                        $('#count-total').html('<b>' +
                            '<span class="">Tổng</span>: ' +
                            '<span class="bold c-red" id="count-total">' + resp.paging.totalResult + '</span>' +
                            '</b>');
                        return $('#paging').html(createPaging(resp.paging));
                    }})
                }
  
            }
            else{
                swal({ title: 'Thông báo!', text: resp.message || 'Có lỗi xảy ra' });
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
  
    return {
        init: function () {
  
            window.onbeforeunload = null;
            bindTextValue();
            bindClick();
  
            $('.multi-date-picker').datepicker({
                multidate: 2,
                multidateSeparator: ' - ',
                format: 'dd/mm/yyyy'
            });
        },
        uncut: function () {
            // Disable sự kiện khi đóng trang
            $(document).off('click', '#btn-search');
            $(document).off('click', '.zpaging');
            $(document).off('keyup', '.filter');
            $(document).off('click', '#download-excel');
            $(document).off('click', '.playAudio');
            $(document).off('click', '.download-audio');
            $(document).off('click', '.zmdi-refresh');
        }
    };
  }(jQuery);