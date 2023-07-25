var DFT = function ($) {
    var options = {};
    var options2 = {};
    var queryThread = {threadId: '', page: 1};
    var createPaging = function (paging, classPaging) {
        if (!paging) return '';
        var firstPage = paging.first ? '<li><a class="' + classPaging +'" data-link="' + paging.first + '">&laquo;</a></li>' : '';
        var prePage = paging.previous ? '<li><a class="' + classPaging +'" data-link="' + paging.previous + '">&lsaquo;</a></li>' : '';
        var pageNum = '';
        for (var i = 0; i < paging.range.length; i++) {
            if (paging.range[i] == paging.current) {
                pageNum += '<li class="active"><span>' + paging.range[i] + '</span></li>';
            } else {
                pageNum += '<li><a class="' + classPaging +'" data-link="' + paging.range[i] + '">' + paging.range[i] + '</a></li>';
            }
        }
        var pageNext = paging.next ? '<li><a class="' + classPaging +'" data-link="' + paging.next + '">&rsaquo;</a></li>' : '';
        var pageLast = paging.last ? '<li><a class="' + classPaging +'" data-link="' + paging.last + '">&raquo;</a></li>' : '';
        return '<div class="paginate text-center">' + '<ul class="pagination">' + firstPage + prePage + pageNum + pageNext + pageLast + '</ul></div>';
    };

    $(document).on('click', '.zpaging', function () {
        //Chuyển trang
        queryThread['page'] = $(this).attr('data-link');
        queryDetail();
    });

    // Lấy dữ liệu lọc và truy vấn server
    var getFilter = function () {
        var filter = _.chain($('.input'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) memo[el.name] = $(el).val();
                return memo;
            }, {}).value();
        _Ajax("/report-chat-offline-by-day?" + $.param(filter), 'GET', {}, function (resp) {
            if (resp.code == 200) {
                if (resp.data.length) {
                    initTable(resp.data);
                    $('.general-info').removeAttr('hidden');
                    initLineChart(resp.data);
                }else{
                    swal({
                        title: 'Không tìm thấy kết quả với khoá tìm kiếm',
                        text: resp.message,
                        type: "warning",
                        confirmButtonColor: "#DD6B55",
                        confirmButtonText: "Xác nhận!",
                        closeOnConfirm: true
                    })
                }
            }
        })
    };

    var initLineChart = function (datas){
        // Vẽ biểu đồ các đường
        var categories = [];
        var totalThread = [];
        var acceptThread = [];
        var missThread = [];
        var waiting = [];
        var progressing = [];
        var finish = [];
        _.each(datas, function(data){
            categories.push(data._id.day + "/" + data._id.month + "/" + data._id.year);
            totalThread.push(data.receive);
            acceptThread.push(data.answer);
            missThread.push(data.receive - data.answer);
            waiting.push(data.waiting);
            progressing.push(data.progressing);
            finish.push(data.finish);
        });

        Highcharts.chart('container', {

            title: {
                text: 'Biểu đồ số lượng theo ngày'
            },

            xAxis: {
                categories: categories
            },

            yAxis: {
                title: {
                    text: 'Số lượng'
                }
            },
            legend: {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'middle'
            },
            series: [{
                name: 'Chat nhận',
                data: totalThread
            }, {
                name: 'Chat trả lời',
                data: acceptThread
            }, {
                name: 'Chat nhỡ',
                data: missThread
            }, {
                name: 'Chờ xử lý',
                data: waiting
            }, {
                name: 'Đang xử lý',
                data: progressing
            }, {
                name: 'Đã xử lý',
                data: finish
            }],

            responsive: {
                rules: [{
                    condition: {
                        maxWidth: 500
                    },
                    chartOptions: {
                        legend: {
                            layout: 'horizontal',
                            align: 'center',
                            verticalAlign: 'bottom'
                        }
                    }
                }]
            }

        });

    };

    // Hiển thị dữ liệu lên giao diện
    var initTable = function (datas) {
        $("#tbBody").empty();
        _.each(datas, function (data, i) {
            var tags = _.Tags([
                {
                    tag: 'tr', attr: {class: 'trBody', threadId: data.threadId}, childs: [
                    {
                        tag: 'td',
                        attr: {class: 'text-center'},
                        content: data._id.day + "/" + data._id.month + "/" + data._id.year
                    },//thang
                    {tag: 'td', attr: {class: 'text-center'}, content: (data.receive).toString()},//chat nhan
                    {tag: 'td', attr: {class: 'text-center'}, content: (data.answer).toString()},//chat tra loi
                    {tag: 'td', attr: {class: 'text-center'}, content: (data.receive - data.answer).toString()},//chat nho
                    {tag: 'td', attr: {class: 'text-center'}, content: Math.round((data.answer / data.receive) * 100) + "%"},//ti le phuc vu
                    {tag: 'td', attr: {class: 'text-center'}, content: (data.waiting).toString()},
                    {tag: 'td', attr: {class: 'text-center'}, content: (data.progressing).toString()},
                    {tag: 'td', attr: {class: 'text-center'}, content: (data.finish).toString()}
                ]
                }
            ]);
            $("#tbBody").append(tags);
        })
    };

    var initDetailTable = function (datas) {
        $("#tbDetail").empty();
        _.each(datas, function (data, i) {
            var tags = _.Tags([
                {
                    tag: 'tr', childs: [
                    {
                        tag: 'td',
                        attr: {class: 'text-center'},
                        content: moment(data.created).format('DD/MM/YYYY HH:mm:ss')
                    },//thang
                    {tag: 'td', attr: {class: 'text-center'}, content: data.agent},
                    {tag: 'td', attr: {class: 'text-center'}, content: data.name ? data.name : data.clientId.split('-')[0]},
                    {tag: 'td', attr: {class: 'text-center'}, content: data.phone ? data.phone : ''},
                    {tag: 'td', attr: {class: 'text-center'}, content: data.content}
                ]
                }
            ]);
            $("#tbDetail").append(tags);
        })
    };

    var queryDetail = function (){
        _Ajax("/report-chat-offline-by-day?getDetail=1&threadId=" + queryThread.threadId + '&page=' + queryThread.page, 'GET', {}, function (resp) {
            if (resp.code == 200) {
                if (resp.data.length) {
                    $('.add-paging').html(createPaging(resp.paging, 'zpaging'));
                    $('.detail-info').removeAttr('hidden');
                    initDetailTable(resp.data);
                }else{
                    swal({
                        title: 'Không tìm thấy kết quả với khoá tìm kiếm',
                        text: resp.message,
                        type: "warning",
                        confirmButtonColor: "#DD6B55",
                        confirmButtonText: "Xác nhận!",
                        closeOnConfirm: true
                    })
                }
            }
        })
    };

    var bindClick = function () {
        // Click Button Tìm kiếm
        $('a.btn.bgm-blue.uppercase.c-white').click(function () {
            getFilter();
        });
        $('#exportexcel').on('click', function (event) {
            var todaysDate = moment().format('DD-MM-YYYY');
            var exportexcel = tableToExcel('exceldata', 'My Worksheet');
            $(this).attr('download', todaysDate + '_BaoCaoChatTheoNgay.xls')
            $(this).attr('href', exportexcel);
        });
        // Thay đổi ô lọc theo ngày
        $("#startDate").on("dp.change", function (e) {
            $('#endDate').data("DateTimePicker").minDate(e.date);
        });
        $("#endDate").on("dp.change", function (e) {
            $('#startDate').data("DateTimePicker").maxDate(e.date);
        });

        $(document).on("click", "tr.trBody", function(e){
            queryThread['threadId'] = $(this.closest('tr')).attr('threadId');
            queryDetail();
        });
    };
    // Cập nhật lại channel khi thay đổi công ty
    var cascadeOption = function () {
        $('select[name="idCompany"]').on('change', function () {
            $.get('/company-channel', {idCompany: $(this).val()}, function (res) {
                $('select[name="channelId"]').empty();
                _.each(res.channel, function (o) {
                    $('select[name="channelId"]').append(_.Tags([{
                        tag: 'option',
                        attr: {value: o._id},
                        content: o.name
                    }]));
                })
                $('select[name="channelId"]').selectpicker('refresh');
            });
        })
    }
    var bindSubmit = function () {};

    // Hiển thị tên cột theo file config
    var bindTextValue = function () {
        _.each(_.allKeys(_config.MESSAGE.REPORT_CHAT_BY_), function (item) {
            $('.' + item).html(_config.MESSAGE.REPORT_CHAT_BY_[item]);
        });
    }
    return {
        init: function () {
            $(document).on('click', '.zmdi-refresh', function () {
                _.LoadPage(window.location.hash);
            });
            if (_.has(window.location.obj, 'idCompany')) $('select[name="idCompany"]').val(window.location.obj.idCompany).selectpicker('refresh');
            //if (_.has(window.location.obj, 'agentId[]')) {
            //    var item = decodeURI(window.location).split("?")[1].split("&");
            //    var array = [];
            //    _.each(item, function (o) {
            //        if (o.split("=")[0] == "agentId[]") {
            //            array.push(o.split("=")[1]);
            //        }
            //    })
            //    $('select[name="agentId"]').selectpicker("val", array).selectpicker('refresh');
            //}
            //;
            var s = _.has(window.location.obj, 'startDate') ? window.location.obj['startDate'] : "";
            var e = _.has(window.location.obj, 'endDate') ? window.location.obj['endDate'] : "";
            $('#startDate').val(s).datetimepicker({maxDate: e});
            $('#endDate').val(e).datetimepicker({minDate: s});
            bindClick();
            //bindSubmit();
            bindTextValue();
            cascadeOption();
            //$('#container').highcharts(options);
            //$('#container2').highcharts(options2);
        },
        uncut: function () {
            // Disable sự kiện khi đóng page
            $(document).off('click', 'a.btn.bgm-blue.uppercase.c-white');
            $(document).off('click', '#exportexcel');
            $(document).off('change', 'select[name="idCompany"]');
            $(document).off('click', '.zmdi-refresh');
        }
    };
}(jQuery);