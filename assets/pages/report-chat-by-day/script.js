var DFT = function ($) {
    var options = {};
    var options2 = {};
    // Lấy dữ liệu lọc và truy vấn server
    var getFilter = function () {
        var filter = _.chain($('.input'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) memo[el.name] = $(el).val();
                return memo;
            }, {}).value();
        _Ajax("/report-chat-by-day?" + $.param(filter), 'GET', {}, function (resp) {
            console.log(resp);
            if (resp.code == 200) {
                console.log(resp.data);
                if (resp.data.online.length) {
                    initTable(resp.data.online);
                    initLineChart(resp.data.online);
                }else
                {
                    swal({
                        title: 'Không tìm thấy kết quả với khoá tìm kiếm',
                        text: resp.message,
                        type: "warning",
                        confirmButtonColor: "#DD6B55",
                        confirmButtonText: "Xác nhận!",
                        closeOnConfirm: true
                    })
                }

                initPieChart(resp.data);
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

    var initPieChart = function (datas){
        var total = datas.offline;
        var progressing = 0;
        var finish = 0;
        var waiting = 0;
        var missing = 0;
        _.each (datas.online, function (dt){
            total +=  dt.receive;
            progressing += dt.progressing;
            finish += dt.finish;
            waiting += dt.waiting;
            missing += (dt.receive - dt.answer)
        });
        var o_offline = {name: 'Offline', y: datas.offline};
        var o_progressing = {name: 'Đang xử lý', y: progressing};
        var o_finish = {name: 'Đã xử lý', y: finish};
        var o_waiting = {name: 'Chờ xử lý', y: waiting};
        var o_missing = {name: 'Chat nhỡ', y: missing};
        var data = [o_offline, o_waiting, o_progressing, o_finish, o_missing];
        Highcharts.chart('container2', {
            chart: {
                plotBackgroundColor: null,
                plotBorderWidth: null,
                plotShadow: false,
                type: 'pie'
            },
            title: {
                text: ''
            },
            tooltip: {
                pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
            },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: true,
                        format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                        style: {
                            color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
                        }
                    }
                }
            },
            series: [{
                name: 'Tỉ lệ',
                colorByPoint: true,
                data: data
            }]
        });

    };

    // Hiển thị dữ liệu lên giao diện
    var initTable = function (datas) {
        $("#tbBody").empty();
        _.each(datas, function (data, i) {
            var tags = _.Tags([
                {
                    tag: 'tr', attr: {id: data._id}, childs: [
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
    }
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
    var bindSubmit = function () {
        var cat = [];
        var totalTime = [];
        var totalTalkTime = [];
        var answeredCall = [];
        var unansweredCall = [];
        _.each(_.pluck(result, 'date'), function (obj) {
            cat.push(moment(obj).format("MM"));
        });
        _.each(_.pluck(result, 'data'), function (obj) {
            totalTime.push(obj.totalDuration / 1000);
            totalTalkTime.push(obj.callDuration / 1000);
            answeredCall.push(obj.connected);
            unansweredCall.push(obj.totalCall - obj.connected);
        });
        options = {
            title: {
                text: 'Biểu đồ thời gian gọi',
                x: -20 //center
            },
            xAxis: {
                categories: cat
            },
            yAxis: {
                title: {
                    text: "Thời lượng(giây)"
                }
            },
            tooltip: {
                valueSuffix: ' giây'
            },
            legend: {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'middle',
                borderWidth: 0
            },
            series: [
                {
                    name: 'Tổng thời lượng',
                    data: totalTime
                }, {
                    name: 'Thời lượng gọi',
                    data: totalTalkTime
                }
            ]
        };
        options2 = {
            title: {
                text: 'Biểu đồ trả lời cuộc gọi',
                x: -20 //center
            },
            xAxis: {
                categories: cat
            },
            yAxis: {
                title: {
                    text: "Cuộc gọi"
                }
            },
            tooltip: {
                valueSuffix: ' cuộc'
            },
            legend: {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'middle',
                borderWidth: 0
            },
            series: [
                {
                    name: 'Cuộc gọi được phục vụ',
                    data: answeredCall
                }, {
                    name: 'Cuộc gọi không trả lời',
                    data: unansweredCall
                }
            ]
        };
    };

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