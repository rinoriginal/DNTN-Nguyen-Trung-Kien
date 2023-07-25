var DFT = function ($) {
    /**
    * Hiển thị tên trường/cột theo file config
    */
    var bindValueChat = function () {
        _.each(_.allKeys(_config.MESSAGE.REPORT_STATISTIC_CHAT_BY_CHANNEL), function (item) {
            $('.' + item).html(_config.MESSAGE.REPORT_STATISTIC_CHAT_BY_CHANNEL[item]);
        });
    };

    var bindClickChat = function () {
        // Chuyển trang
        $(document).on('click', '#pagingChat .pagination li a', function (e) {
            e.preventDefault();
            let url = e.target.getAttribute('href')
            let i = url.indexOf("?page=");
            let page = i === -1 ? 1 : url.substring(i + 6);
            _page = page;
            getFilterChat(false, false, page);
        });
        // Click tìm kiếm
        $('#searchChat').click(function () {
            console.log(1111111111);

            getFilterChat(true, false);
        });

        // download Excel
        $(document).on('click', '#btnExport', function (e) {
            // e.preventDefault();
            getFilterChat(true, true);
        });

        // Làm mới trang
        $(document).on('click', '.zmdi-refresh', function () {
            _.LoadPage(window.location.hash);
        });


        // chọn biểu đồ
        $("#showHideFields .menuChart").click(function () {
            let x = $(this).attr('data-id')
            switch (x) {
                case 'PNG':
                    $('.exportPNG').click();
                    break;
                case '1':
                    $("#chart").attr('style', 'display:block')
                    $("#nameChart").attr('style', 'display:block')

                    $("#chart1").attr('style', 'display:none')
                    $("#nameChart1").attr('style', 'display:none')

                    $("#chart2").attr('style', 'display:none')
                    $("#nameChart2").attr('style', 'display:none')
                    break;
                case '2':
                    $("#chart").attr('style', 'display:none')
                    $("#nameChart").attr('style', 'display:none')

                    $("#chart1").attr('style', 'display:block')
                    $("#nameChart1").attr('style', 'display:block')

                    $("#chart2").attr('style', 'display:block')
                    $("#nameChart2").attr('style', 'display:block')
                    break;
                case '3':
                    $("#chart").attr('style', 'display:none')
                    $("#nameChart").attr('style', 'display:none')

                    $("#chart1").attr('style', 'display:none')
                    $("#nameChart1").attr('style', 'display:none')

                    $("#chart2").attr('style', 'display:block')
                    $("#nameChart2").attr('style', 'display:block')
                    break;
            }
        });
    };

    // Lấy dữ liệu lọc và truy vấn server
    var getFilterChat = function (load, exportExcel, page) {
        var filter = _.chain($('.input'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) memo[el.name] = $(el).val();
                return memo;
            }, {}).value();

        if (page) filter['page'] = page;
        if (exportExcel == true) filter['exportExcel'] = exportExcel
        console.log('filter', filter);

        if (load) {
            _Ajax("/report-statistic-chat-by-channel?" + $.param(filter), 'GET', {}, function (resp) {
                console.log('ahihi', resp);

                if (resp.code == 200) {
                    $('#body-table').empty();
                    if (resp.data.length) {
                        console.log(resp.data.length);
                        let total = document.querySelector('.totalChat');
                        if (total) {
                            total.remove();
                        }
                        $('#pagingChat').empty();
                        loadData(resp);
                        loadSum(resp);
                        loadChart(resp.sum);
                        loadChart1(resp.sum);
                        loadChart2(resp.sum);
                        $('#pagingChat').append(_.paging('#report-statistic-chat-by-channel', resp.paging));
                        if (exportExcel == true) {
                            downloadFromUrl(resp.linkFile);
                        }
                    } else {
                        swal({
                            title: "Thông báo",
                            text: "Không tìm thấy các trường phù hợp",
                            type: "warning",
                            confirmButtonColor: "#DD6B55",
                            confirmButtonText: "Xác nhận!",
                            closeOnConfirm: true
                        }, function () {
                            $('#pagingChat').empty();
                            $('#thead-table').empty();
                        });
                    }
                } else {
                    swal({ title: 'Cảnh báo!', text: resp.message });
                }
            })
        } else {
            _Ajax("/report-statistic-chat-by-channel?" + $.param(filter), 'GET', {}, function (resp) {
                console.log('ehehe');
                if (resp.code == 200) {
                    $('#body-table').empty();
                    if (resp.data.length) {
                        console.log(resp.data.length);
                        let total = document.querySelector('.totalChat');
                        if (total) {
                            total.remove();
                        }
                        $('#pagingChat').empty();
                        loadData(resp);
                        loadSum(resp);
                        loadChart(resp.sum);
                        loadChart1(resp.sum);
                        loadChart2(resp.sum);
                        $('#pagingChat').append(_.paging('#report-statistic-chat-by-channel', resp.paging));
                    }
                } else {
                    swal({ title: 'Cảnh báo!', text: resp.message });
                }
            })
        }

    };


    // Hiển thị dữ liệu lên giao diện
    var loadData = function (resp) {
        console.log(1111, resp);
        var msToTime = function (s) {
            if (!s || s == 0) return '00:00:00';
            var ms = s % 1000;
            s = (s - ms) / 1000;
            var secs = s % 60;
            s = (s - secs) / 60;
            var mins = s % 60;
            var hrs = (s - mins) / 60;
            return _.pad(hrs, 2, '0') + ':' + _.pad(mins, 2, '0') + ':' + _.pad(secs, 2, '0');
        }
        var template = '<tr class="text-center">' +
            '<td>{0}</td>' +
            '<td>{1}</td>' +
            '<td>{2}</td>' +
            '<td>{3}</td>' +
            '<td>{4}</td>' +
            '<td>{5}</td>' +
            '<td>{6}</td>' +
            '<td>{7}</td>' +
            '</tr>';
        var rows = '';
        resp.data.forEach(function (el) {
            if (_.isEmpty(el)) return;
            rows += template.str(
                el.channel ? el.channel.name : '',
                el.count,
                el.chatReceive,
                el.chatMiss,
                el.chatOffline,
                msToTime(el.chatTime),
                (el.chatReceive + el.chatMiss) == 0 ? '00:00:00' : msToTime(el.chatTime / (el.chatReceive + el.chatMiss)),
                (el.chatReceive + el.chatMiss) == 0 ? '00:00:00' : msToTime(el.waitTime / (el.chatReceive + el.chatMiss)),
            );
        });
        $('#body-table').html(rows);
        window.MainContent.loadTooltip();
    };

    var loadSum = function (resp) {
        var msToTime = function (s) {
            if (!s || s == 0) return '00:00:00';
            var ms = s % 1000;
            s = (s - ms) / 1000;
            var secs = s % 60;
            s = (s - secs) / 60;
            var mins = s % 60;
            var hrs = (s - mins) / 60;
            return _.pad(hrs, 2, '0') + ':' + _.pad(mins, 2, '0') + ':' + _.pad(secs, 2, '0');
        }

        var sumRows = '';
        let total = '<tr class="text-center m-t-5 ">' +
            '<td class="bgm-red c-white"><strong>TỔNG</strong></td>' +
            '<td class="c-red"><strong>{0}</strong></td>' +
            '<td class="c-red"><strong>{1}</strong></td>' +
            '<td class="c-red"><strong>{2}</strong></td>' +
            '<td class="c-red"><strong>{3}</strong></td>' +
            '<td class="c-red"><strong>{4}</strong></td>' +
            '<td class="c-red"><strong>{5}</strong></td>' +
            '<td class="c-red"><strong>{6}</strong></td>' +
            '</tr>'
        let sumChat = 0;
        let sumChatReceive = 0;
        let sumChatMiss = 0;
        let sumOffline = 0;
        let sumChatTime = 0;
        let sumChatTimeAvg = 0;
        let sumWaitTimeAvg = 0;
        resp.sum.forEach(function (el) {
            sumChat += el.count;
            sumChatReceive += (el.chatReceive);
            sumChatMiss += el.chatMiss;
            sumOffline += el.chatOffline;
            sumChatTime += el.chatTime;
            sumChatTimeAvg += (el.chatReceive + el.chatMiss) == 0 ? 0 : (el.chatTime / (el.chatReceive + el.chatMiss));
            sumWaitTimeAvg += (el.chatReceive + el.chatMiss) == 0 ? 0 : (el.waitTime / (el.chatReceive + el.chatMiss));
        })
        sumRows += total.str(sumChat, sumChatReceive, sumChatMiss, sumOffline, msToTime(sumChatTime), msToTime(sumChatTimeAvg),  msToTime(sumWaitTimeAvg))
        $('#thead-table').html(sumRows);
        window.MainContent.loadTooltip();
    }

    var loadChart = function (resp) {
        console.log(1111111111, resp);

        let dataLabel = [];
        let dataConnect = [];
        let dataMiss = [];
        let dataOffline = [];
        _.each(resp, function (el) {
            dataLabel.push(el.channel ? el.channel.name : '');
            dataConnect.push(el.chatReceive);
            dataMiss.push(el.chatMiss);
            dataOffline.push(el.chatOffline);
        })

        let options = {
            series: [{
                name: 'Tiếp nhận',
                type: 'column',
                data: dataConnect
            }, {
                name: 'Nhỡ',
                type: 'column',
                data: dataMiss
            }, {
                name: 'Offline',
                type: 'column',
                data: dataOffline
            }],
            chart: {
                height: 500,
                type: 'bar',
                stacked: true,
                toolbar: {
                    show: true,
                    tools: {
                        download: false,
                        selection: false,
                        zoom: false,
                        zoomin: false,
                        zoomout: false,
                        pan: false,
                        reset: false | '<img src="/static/icons/reset.png" width="20">'
                    }
                }
            },
            //set color cột
            fill: {
                colors: ['#F98C0E', '#93D5DF', '#989898']

            },
            //màu border column
            colors: ['#F98C0E', '#93D5DF', '#989898'],
            //set width column
            plotOptions: {
                bar: {
                    columnWidth: '5%',
                }
            },
            stroke: {
                width: [1, 1, 1],
                curve: 'smooth',
            },
            xaxis: {
                categories: dataLabel,
            },
            tooltip: {
                enabledOnSeries: [0, 1, 2],
                fixed: {
                    enabled: true,
                    position: 'topLeft', // topRight, topLeft, bottomRight, bottomLeft
                    offsetY: 30,
                    offsetX: 60
                },
            },
            legend: {
                position: 'top',
                horizontalAlign: 'center',
                offsetX: 40,
                //set color radio chú thích
                markers: {
                    radius: 0,
                    fillColors: ['#F98C0E', '#93D5DF', '#989898']
                }
            }
        };
        $("#chart").empty()
        let chart = new ApexCharts(document.querySelector("#chart"), options);
        chart.render();
        console.log('ahiiiiiiiiii', $(".apexcharts-zoomable").attr('class'));
        $(".apexcharts-zoomable").attr('class', 'apexcharts-canvas apexchartspq4ep1au apexcharts-theme-light apexcharts-zoomable box-shadow1')
    }

    var loadChart1 = function (resp) {
        console.log(1111111111, resp);

        let dataConnect = 0;
        let dataMiss = 0;
        let dataOffline = 0;
        _.each(resp, function (el) {
            dataConnect += el.chatReceive;
            dataMiss += el.chatMiss;
            dataOffline += el.chatOffline;
        })

        let options = {
            series: [dataConnect, dataMiss, dataOffline],
            labels: ['Tiếp nhận', 'Nhỡ', 'Offline'],
            chart: {
                height: 400,
                type: 'donut',
                toolbar: {
                    show: true,
                    tools: {
                        download: false,
                        selection: false,
                        zoom: false,
                        zoomin: false,
                        zoomout: false,
                        pan: false,
                        reset: false | '<img src="/static/icons/reset.png" width="20">'
                    }
                }
            },
            fill: {
                colors: ['#F98C0E', '#93D5DF', '#989898']

            },
            plotOptions: {
                pie: {
                    customScale: 0.8,
                    donut: {
                        size: '75%'
                    }
                }
            },
            legend: {
                position: 'right',
                horizontalAlign: 'center',
                offsetX: 150,
                offsetY: 150,
                width: 300,
                height: 300,
                fontSize: '14px',
                //set color radio chú thích
                markers: {
                    width: 16,
                    height: 16,
                    radius: 0,
                    fillColors: ['#F98C0E', '#93D5DF', '#989898']
                }
            },
            // responsive: [{
            //     breakpoint: 480,
            //     options: {
            //         chart: {
            //             width: 200
            //         },
            //         legend: {
            //             position: 'bottom'
            //         }
            //     }
            // }]
        };
        $("#chart1").empty()
        let chart = new ApexCharts(document.querySelector("#chart1"), options);
        chart.render();
        console.log('ahiiiiiiiiii', $(".apexcharts-zoomable").attr('class'));
        $(".apexcharts-zoomable").attr('class', 'apexcharts-canvas apexchartspq4ep1au apexcharts-theme-light apexcharts-zoomable box-shadow1')
        $("#chart1").attr('style', 'display:none')
        $("#nameChart1").attr('style', 'display:none')
    }

    var loadChart2 = function (resp) {
        let dataLabel = [];
        let dataCount = [];
        let totalCount = 0;
        _.each(resp, function (el) {
            totalCount += el.count;
        })
        console.log('ahihi', totalCount);

        _.each(resp, function (el) {
            dataLabel.push(el.channel ? el.channel.name : '');
            dataCount.push(Math.round(el.count * 100 / totalCount));
        })

        let options = {
            series: [{
                name: 'Đã khai thác',
                type: 'column',
                data: dataCount
            }],
            chart: {
                height: 500,
                type: 'bar',
                stacked: true,
                toolbar: {
                    show: true,
                    tools: {
                        download: false,
                        selection: false,
                        zoom: false,
                        zoomin: false,
                        zoomout: false,
                        pan: false,
                        reset: false | '<img src="/static/icons/reset.png" width="20">'
                    }
                }
            },
            //set color cột
            fill: {
                colors: ['#F98C0E']

            },
            //màu border column
            colors: ['#F98C0E'],
            //set width column
            plotOptions: {
                bar: {
                    columnWidth: '5%',
                }
            },
            stroke: {
                width: [1],
                curve: 'smooth',
            },
            xaxis: {
                categories: dataLabel,
            },
            yaxis: [
                {
                    axisTicks: {
                        show: true,
                    },
                    labels: {

                        formatter: function (value) {
                            return value + "%";
                        }
                    },
                    max: 100,
                    min: 0,
                    axisTicks: {
                        show: false,
                    },
                    tooltip: {
                        enabled: true
                    }
                }
            ],
            tooltip: {
                enabledOnSeries: [0],
                fixed: {
                    enabled: true,
                    position: 'topLeft', // topRight, topLeft, bottomRight, bottomLeft
                    offsetY: 30,
                    offsetX: 60
                },
            },
            legend: {
                position: 'top',
                horizontalAlign: 'center',
                showForSingleSeries: true,
                offsetX: 40,
                //set color radio chú thích
                markers: {
                    radius: 0,
                    fillColors: ['#F98C0E']
                }
            }
        };
        $("#chart2").empty()
        let chart = new ApexCharts(document.querySelector("#chart2"), options);
        chart.render();
        console.log('ahiiiiiiiiii', $(".apexcharts-zoomable").attr('class'));
        $(".apexcharts-zoomable").attr('class', 'apexcharts-canvas apexchartspq4ep1au apexcharts-theme-light apexcharts-zoomable box-shadow1')
        $("#chart2").attr('style', 'display:none')
        $("#nameChart2").attr('style', 'display:none')

    }

    return {
        init: function () {
            $('.container').attr('class', 'container-fluid')
            bindValueChat();
            bindClickChat();
            getFilterChat(false);
            window.onbeforeunload = null;
            $('.multi-date-picker').datepicker({
                multidate: 2,
                multidateSeparator: ' - ',
                format: 'dd/mm/yyyy'
            });
            $('.date-picker').datepicker({
                format: 'dd/mm/yyyy'
            });
            $('.selectpicker').selectpicker('refresh');

            // //dữ liệu fake show giao diện 
            // let data = { data: [{ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8 }] }
            // loadData(data)

            // loadChart()
        },
        uncut: function () {
            $(document).off('click', '#btnExport');
            $(document).off('click', '#pagingChat .pagination li a');
        }
    };
}(jQuery);