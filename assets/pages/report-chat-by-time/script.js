var DFT = function ($) {
    // Lấy tiêu chí lọc và truy vấn server
    var getFilter = function () {
        var filter = _.chain($('.input'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '')&&!_.isEqual($(el).val(), null)) memo[el.name] = $(el).val();
                return memo;
            }, {}).value();
        window.location.hash = newUrl(window.location.hash, filter);
    };

    var bindClick = function () {
        // Click tìm kiếm
        $('a.btn.bgm-blue.uppercase.c-white').click(function () {
            getFilter();
        });
        // Xuất file báo cáo
        $('#exportexcel').on('click', function (event) {
            var todaysDate = moment().format('DD-MM-YYYY');
            var exportexcel = tableToExcel('exceldata', 'My Worksheet');
            $(this).attr('download', todaysDate + '_Báo cáo chat - Báo cáo theo khung giờ.xls')
            $(this).attr('href', exportexcel);
        })

        // Thay đổi dữ liệu ô lọc theo ngày
        $("#startDate").on("dp.change", function (e) {
            $('#endDate').data("DateTimePicker").minDate(e.date);
        });
        $("#endDate").on("dp.change", function (e) {
            $('#startDate').data("DateTimePicker").maxDate(e.date);
        });
    };
    var bindSubmit = function(){

    };
    // Cập nhật dữ liệu channel khi thay đổi công ty
    var cascade = function(){
        $('select[name="idCompany"]').on('change', function () {
            $.get('/report-chat-by-time', {idParent: $(this).val()}, function (res) {
                $('select[name="agentId"]').empty();
                _.each(res.agents, function(o){
                    $('select[name="agentId"]').append(_.Tags([{tag: 'option', attr: {value: o._id}, content: o.displayName}]));
                });
                $('select[name="agentId"]').selectpicker('refresh');

                $('select[name="idChannel"]').empty();
                _.each(res.channels, function(o){
                    $('select[name="idChannel"]').append(_.Tags([{tag: 'option', attr: {value: o._id}, content: o.name}]));
                });
                $('select[name="idChannel"]').selectpicker('refresh');
            });
        });
    };
    // Hiển thị tên cột theo file config
    var bindTextValue = function () {
        _.each(_.allKeys(_config.MESSAGE.REPORT_CHAT_BY_TIME), function (item) {
            $('.' + item).html(_config.MESSAGE.REPORT_CHAT_BY_TIME[item]);
        });
    };

    var renderChart = function (data) {
        if (data.length){
            var totalThread = [];
            var acceptThread = [];
            var missThread = [];
            for (var i = 0; i < 24; ++i){
                totalThread.push(0);
                acceptThread.push(0);
                missThread.push(0);
            }
            //data.push({_id: 1, hours: [{block: 111}, {block: 222}]});
            var threads = _.flatten(_.pluck(data, 'hours'));
            _.each(threads, function(a){
                totalThread[a['block']] += a['total'];
                acceptThread[a['block']] += a['accept'];
                missThread[a['block']] += a['missed'];
            });
            Highcharts.chart('container', {

                title: {
                    text: 'Biểu đồ số lượng theo khung giờ'
                },

                xAxis: {
                    categories: ["0H-1H", "1H-2H", "2H-3H", "3H-4H", "4H-5H", "5H-6H", "6H-7H", "7H-8H", "8H-9H", "9H-10H", "10H-11H"
                        , "11H-12H", "12H-13H", "13H-14H", "14H-15H", "15H-16H", "16H-17H", "17H-18H", "18H-19H", "19H-20H", "20H-21H", "21H-22H", "22H-23H", "23H-24H"]
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

                // plotOptions: {
                //     series: {
                //         label: {
                //             connectorAllowed: false
                //         },
                //         pointStart: 2010
                //     }
                // },

                series: [{
                    name: 'Tổng',
                    data: totalThread
                }, {
                    name: 'Được phục vụ',
                    data: acceptThread
                }, {
                    name: 'Cuộc chat nhỡ',
                    data: missThread
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
        }
    };

    return {
        init: function () {
            // Thông báo khi không có kết quả
            if (isAlertSearch && Object.keys(window.location.obj).length > 0) {
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

            // Cập nhật lại các tiêu chí đã lọc
            _.each(window.location.obj, function (v, k) {
                var el = $('#' + k.replace(['[]'], ''));
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
            // Cập nhật lại tiêu chí lọc theo agent
            if (_.has(window.location.obj, 'agentId[]')){
                var item = decodeURI(window.location).split("?")[1].split("&");
                var array = [];
                _.each(item, function(o){
                    if(o.split("=")[0]=="agentId[]"){
                        array.push(o.split("=")[1]);
                    }
                })
                $('select[name="agentId"]').selectpicker("val", array).selectpicker('refresh');
            };
            bindClick();
            bindSubmit();
            bindTextValue();
            cascade();
            renderChart(data);
        },
        uncut: function () {
            // disbale sự kiện khi đóng trang
            $(document).off('change','select[name="idCompany"]');
            $(document).off('click', 'a.btn.bgm-blue.uppercase.c-white');
            $(document).off('click', '#exportexcel');
        }
    };
}(jQuery);