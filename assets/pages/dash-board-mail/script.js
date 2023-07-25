var DFT = function ($) {
    // flag để dừng interval khi sang sang khác
    var instanceInterval = null;
    let instanceIntervalStatus = null;
    var typeDonut = 'day';
    var typeBar = 'day';
    // let lstAgent = [];

    var bindClickDashBoard = function () {
        // Click tìm kiếm
        // $('#searchDashBoard').click(function () {
        //     console.log(1111111111);
        //     getFilterDashBoard(true);
        // });

        // Làm mới trang
        $(document).on('click', '.zmdi-refresh', function () {
            _.LoadPage(window.location.hash);
        });

        // donut change time
        $(document).on('click', '.timeDonut', function () {
            let _time = $(this).attr('type-id');
            typeDonut = _time;
            getFilterChart('donut');
        });

        // bar change time
        $(document).on('click', '.timeBar', function () {
            let _time = $(this).attr('type-id');
            typeBar = _time;
            getFilterChart('bar');
        });

        // search Agent
        $(document).on('click', '#searchAgent', function () {
            $('#channelMail').empty();
            getFilterChannel(true);
        });

        // click btn hoàn thành
        $(document).on('click', '.btnComplete', function () {
            console.log(22222222, $(this).attr('channel-id'));
            let idChannel = $(this).attr('channel-id');
            getFilterByStatus('complete', idChannel)
        });
        // click btn chưa hoàn thành
        $(document).on('click', '.btnUnComplete', function () {
            console.log(22222222, $(this).attr('channel-id'));
            let idChannel = $(this).attr('channel-id');
            getFilterByStatus('unComplete', idChannel)
        });
        // click row agent
        $(document).on('click', '.rowAgent', function () {
            console.log(22222222, $(this).attr('channel-id'));
            let idChannel = $(this).attr('channel-id');
            let idAgent = $(this).attr('agent-id');
            getFilterByStatus('agent', idChannel, idAgent)
        });

        // query lấy dữ liệu lịch sử mail
        $(document).on('click', '.btn-show', function (e) {
            let filter = {}
            filter.scope = 'search-ticket-mail'
            filter.idTicket = $(this).attr('data-id')
            _Ajax("/dash-board-mail?" + $.param(filter), 'GET', {}, function (resp) {
                if (resp.code == 200) {
                    loadHistory(resp)
                } else {
                    swal({ title: 'Cảnh báo !', text: resp.message });
                }
            })

            // open modal
            $('#modal-form-box-mail').modal({
                backdrop: 'static',
                'keyboard': false
            });
            // close modal
            $('#modal-form-box-mail').on('hidden.bs.modal', function (e) {
                $('#first-tab').trigger('click')
                $('#pills-tabContent').empty()
            })
        })

    };

    // hiển thị lịch sử mail
    var loadHistory = function (resp) {
        console.log(6666666666, resp);
        let _el = resp.data;
        $('#pills-tabContent').empty()
      
        let templateBoxMail =

            `<div role="tabpanel" class="tab-pane active" id="tab-list-mail">` +

            `   <div class="panel-body p-0 bgm-header">` +
            `       <div class="col-md-12 p-0 box-shadow1"">` +
            `           <div class="row p-l-30 p-r-30 p-t-10">` +
            `               <div class="col-md-6 m-t-5 m-b-5">` +
            `                   <div class="col-md-4 text-left">` +
            `                       <label for="name" class="control-label p-0"><strong>From :</strong></label>` +
            `                   </div>` +
            `                   <div class="col-md-8">` +
            (_el.from ? _el.from : '') +
            `                    </div>` +
            `               </div>` +
            `               <div class="col-md-6 m-t-5 m-b-5">` +
            `                   <div class="col-md-4 text-left">` +
            `                       <label for="name" class="control-label p-0"><strong>Subject: </strong></label>` +
            `                   </div>` +
            `                   <div class="col-md-8">` +
            (_el.subject ? _el.subject : '') +
            `                    </div>` +
            `               </div>` +
            `           </div>` +
            `           <div class="row m-b-5 p-l-30 p-r-30">` +
            `               <div class="col-md-6 m-t-5 m-b-5">` +
            `                   <div class="col-md-4 text-left">` +
            `                       <label for="name" class="control-label p-0"><strong>Agent :</strong></label>` +
            `                   </div>` +
            `                   <div class="col-md-8">` +
            // (!_el.status ? convertStatus(2) : '') +
            (_el.idAgent && _el.idAgent.displayName ? _el.idAgent.displayName : '') +
            `                    </div>` +
            `               </div>` +
            `               <div class="col-md-6 m-t-5 m-b-5">` +
            `                   <div class="col-md-4 text-right">` +
            `                       <label for="name" class="control-label p-0"><strong></strong></label>` +
            `                   </div>` +
            `                   <div class="col-md-8">` +
            // (_el.deadline ? moment(_el.deadline).format('DD/MM/YYYY') : '') +
            `                    </div>` +
            `               </div>` +
            `           </div>` +
            `       </div>` +
            `   </div>` +


            `   <div class="panel-body msg_container_base">` +
            `       <div class="col-md-12">` +
            `           <div class="row p-l-30 p-r-30 p-t-10">` +
            showMail(resp.data) +
            `           </div>` +
            `</div>` +
            `   </div>` +
            `</div>`
        let templateInfo =
            `<div role="tabpanel" class="tab-pane " id="tab-info-mail">` +
            `   <div class="panel-body p-0">` +
            `       <div class="title">` +
            `           <span class="m-4 m-l-16" style="font-size: 11px;">Thông tin hội thoại</span>` +
            `       </div>` +

            `       <div class="col-md-12 p-0">` +
            `           <div class="row p-l-30 p-r-50 p-t-10">` +
            `               <div class="col-md-6 m-t-5 m-b-5">` +
            `                   <div class="col-md-4 text-left">` +
            `                       <label for="name" class="control-label p-0"><strong>Kênh mail :</strong></label>` +
            `                   </div>` +
            `                   <div class="col-md-8">` +
            (_el.aliasId && _el.aliasId.name ? _el.aliasId.name : '') +
            `                    </div>` +
            `               </div>` +
            `               <div class="col-md-6 m-t-5 m-b-5">` +
            `                   <div class="col-md-4 text-left">` +
            `                       <label for="name" class="control-label p-0"><strong></strong></label>` +
            `                   </div>` +
            `                   <div class="col-md-8">` +
            `                    </div>` +
            `               </div>` +
            `           </div>` +
            `           <div class="row m-b-5 p-l-30 p-r-50">` +
            `               <div class="col-md-6 m-t-5 m-b-5">` +
            `                   <div class="col-md-4 text-left">` +
            `                       <label for="name" class="control-label p-0"><strong>Trạng thái :</strong></label>` +
            `                   </div>` +
            `                   <div class="col-md-8 c-orange">` +
            // (!_el.status ? convertStatus(2) : '') +
            convertStatus(_el.status) +
            `                    </div>` +
            `               </div>` +
            `               <div class="col-md-6 m-t-5 m-b-5">` +
            `                   <div class="col-md-4 text-right">` +
            `                       <label for="name" class="control-label p-0"><strong>Ngày hẹn xử lý :</strong></label>` +
            `                   </div>` +
            `                   <div class="col-md-8">` +
            (_el.deadline ? moment(_el.deadline).format('DD/MM/YYYY') : '') +
            `                    </div>` +
            `               </div>` +
            `           </div>` +
            `       </div>` +

            `       <div class="title">` +
            `           <span class="m-4 m-l-16" style="font-size: 11px;">Thông tin khách hàng</span>` +
            `       </div>` +

            `       <div class="col-md-12 p-0" style="height: 410px; overflow-y: scroll; overflow-x: hidden;">` +
            // `           <table class=" table table-borderless col-md-12 p-0 m-b-5 box-shadow">` +
            // resp.str +
            // `           </table>` +
            `           <div class="row p-l-30 p-r-30 p-t-10">` +
            resp.str +
            `           </div>` +
            `       </div>` +
            `       <div class="title">` +
            `           <span class="m-4 m-l-16" style="font-size: 11px;">Nội dung ghi chú</span>` +
            `       </div>` +
            `       <div class="col-md-12 p-0" style="height: 200px; overflow-y: scroll; overflow-x: hidden;">` +
            `           <div class="row m-b-5 p-l-30 p-r-30">` +
            `               <div class="col-md-12 m-t-5 m-b-5">` +
            `                   <div class="col-md-12" style="word-wrap: break-word">` +
            _el.note +
            `                    </div>` +
            `               </div>` +
            `           </div>` +
            `       </div>` +
            `   </div>` +
            `</div>`


        $('#pills-tabContent').append(templateBoxMail)
        $('#pills-tabContent').append(templateInfo)
    }



    // hiển thị tin nhắn lịch sử mail
    var showMail = function (data) {
        let listMail = '';
        if (!data) return ``
        console.log(777777, data);

        data.caseId.forEach(function (item) {
            if (Number(item.activitySubType) == 1) {//customer
                listMail +=
                    `<div class="row msg_container base_sent " style="padding:0">` +
                    `   <div class="col-md-12 col-xs-12 flex-start">` +
                    `       <div>[${moment(item.whenCreated).format('HH:mm - DD/MM/YYYY')}]&nbsp;&nbsp;</div>` +
                    `       <div><span><</span><span style="color: #FC8E10;">${item.formEmailAddress}</span><span>></span></div>` +
                    `   </div>` +
                    `</div>` +
                    `<div class="row msg_container base_sent m-b-50" style="padding:0">` +
                    `   <div class="col-md-12 col-xs-12">` +
                    `       <div class="text-left m-b-3">` +
                    item.content +
                    `       </div>` +
                    `       <div class="">` +
                    `       </div>` +
                    `   </div>` +
                    `</div>`
            }

            if (Number(item.activitySubType) == 6) {//agent
                listMail +=
                    `<div class="row msg_container base_sent " style="padding:0">` +
                    `   <div class="col-md-12 col-xs-12 flex-start">` +
                    `       <div>[${moment(item.whenCreated).format('HH:mm - DD/MM/YYYY')}]&nbsp;&nbsp;</div>` +
                    `       <div><span><</span><span style="color: #1195A4;">${item.formEmailAddress}</span><span>></span></div>` +
                    `   </div>` +
                    `</div>` +
                    `<div class="row msg_container base_sent" style="padding:0">` +
                    `   <div class="col-md-12 col-xs-12">` +
                    `       <div class="text-left m-b-3">` +
                    item.content +
                    `       </div>` +
                    `       <div class="">` +
                    `       </div>` +
                    `   </div>` +
                    `</div>`
            }
        })

        return listMail;
    }


    var getFilterTotal = function () {
        // dash-board-total-mail
        _Ajax("/dash-board-total-mail", 'GET', {}, function (resp) {
            console.log(777, resp);

            if (resp.code == 200) {
                if (resp.message) {
                    let _el = resp.message;
                    //tổng số luồng mail
                    $('#sumHead1').text(_el.totalCaseId.dataCurrentMonth);
                    if (_el.totalCaseId.dataCurrentMonth > _el.totalCaseId.dataPreviousMonth) {
                        $('#rateHead1').attr('class', 'f-18 lbc-green');
                        $('#rateHead1').html(`<i class="zmdi zmdi-trending-up"></i> ` + _el.totalCaseId.percentage + '%');
                    } else {
                        $('#rateHead1').attr('class', 'f-18 c-red');
                        $('#rateHead1').html(`<i class="zmdi zmdi-trending-down"></i> ` + _el.totalCaseId.percentage + '%');
                    }
                    //tổng số mail
                    $('#sumHead2').text(_el.totalMail.dataCurrentMonth);
                    if (_el.totalMail.dataCurrentMonth > _el.totalMail.dataPreviousMonth) {
                        $('#rateHead2').attr('class', 'f-18 lbc-green');
                        $('#rateHead2').html(`<i class="zmdi zmdi-trending-up"></i> ` + _el.totalMail.percentage + '%');
                    } else {
                        $('#rateHead2').attr('class', 'f-18 c-red');
                        $('#rateHead2').html(`<i class="zmdi zmdi-trending-down"></i> ` + _el.totalMail.percentage + '%');
                    }
                    //đã hoàn thành
                    $('#sumHead3').text(_el.totalMailComplete.dataCurrentMonth);
                    if (_el.totalMailComplete.dataCurrentMonth > _el.totalMailComplete.dataPreviousMonth) {
                        $('#rateHead3').attr('class', 'f-18 lbc-green');
                        $('#rateHead3').html(`<i class="zmdi zmdi-trending-up"></i> ` + _el.totalMailComplete.percentage + '%');
                    } else {
                        $('#rateHead3').attr('class', 'f-18 c-red');
                        $('#rateHead3').html(`<i class="zmdi zmdi-trending-down"></i> ` + _el.totalMailComplete.percentage + '%');
                    }
                    //chưa hoàn thành
                    $('#sumHead4').text(_el.totalMailOffline.dataCurrentMonth);
                    if (_el.totalMailOffline.dataCurrentMonth > _el.totalMailOffline.dataPreviousMonth) {
                        $('#rateHead4').attr('class', 'f-18 lbc-green');
                        $('#rateHead4').html(`<i class="zmdi zmdi-trending-up"></i> ` + _el.totalMailOffline.percentage + '%');
                    } else {
                        $('#rateHead4').attr('class', 'f-18 c-red');
                        $('#rateHead4').html(`<i class="zmdi zmdi-trending-down"></i> ` + _el.totalMailOffline.percentage + '%');
                    }
                } else {
                    swal({
                        title: "Thông báo",
                        text: "Không tìm thấy số liệu tổng quát",
                        type: "warning",
                        confirmButtonColor: "#DD6B55",
                        confirmButtonText: "Xác nhận!",
                        closeOnConfirm: true
                    }, function () {

                    });
                }
            } else {
                console.log(22222222, resp);
                swal({ title: 'Cảnh báo!', text: resp.message });
            }
        })

    }

    //truy vấn dữ liệu mail hoàn thành || chưa hoàn thành theo kênh
    var getFilterByStatus = function (status, idChannel, idAgent) {
        console.log(2222222222, status);

        if (status) {
            let filter = {};

            if (status == 'agent') {
                filter['scope'] = 'agent';

            } else {
                filter['scope'] = 'status';
            }

            if (status == 'complete' || status == 'unComplete') {
                filter['status'] = status;
            }

            if (status == 'agent') {
                filter['idAgent'] = idAgent;
            }

            filter['idChannel'] = idChannel;

            console.log(123123123, filter);

            _Ajax("/dash-board-mail?" + $.param(filter), 'GET', {}, function (resp) {
                if (resp.code == 200) {
                    if (resp.data) {
                        loadLstTicketMail(status, resp)
                    } else {
                        swal({
                            title: "Thông báo",
                            text: "Không tìm thấy các trường phù hợp",
                            type: "warning",
                            confirmButtonColor: "#DD6B55",
                            confirmButtonText: "Xác nhận!",
                            closeOnConfirm: true
                        }, function () {

                        });
                    }
                } else {
                    console.log(22222222, resp);
                    swal({ title: 'Cảnh báo!', text: resp.message });
                }
            })
        }
    }

    var loadLstTicketMail = function (status, resp) {
        renderTableHeader(status)
        renderTableRow(status, resp)
        $('#modal-channel-mail').modal({
            backdrop: 'static',
            'keyboard': false
        });
    }

    var renderTableHeader = function (status) {
        let arrHeader = [
            'STT',
            'Agent',
            'Khách hàng',
            'TĐ tiếp nhận yêu cầu',
            'TG xử lý yêu cầu',
            'TĐ tiếp nhận mail cuối',
            status == 'complete' ? 'Trạng thái' : 'TG phản hồi mail',
            'Tác vụ'
        ];
        $('#tbl-label').empty();
        let _th = _.reduce(arrHeader, function (memo, el) { return memo + `<th class="text-center" ${el == 'STT' ? "style = width:50px" : ''}><strong>` + el + `</strong></th>` }, '')
        let htmlHeader = `<tr>` + _th + `</tr>`
        $('#tbl-label').html(htmlHeader)
    }

    var convertStatus = function (n) {
        switch (Number(n)) {
            case 2:
                return 'Hoàn thành';
            default:
                return 'Chưa hoàn thành';
        }
    }

    var renderTableRow = function (status, resp) {
        console.log(2222222222, resp);
        let _stt = 1;
        $('#tbl-data').empty();

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
   
        let checkThoiGian = function (check) {
            let _time = '';
            if (check == 0) _time = '00:00:00';
            if (check || check > 0) _time = msToTime(check);
            return _time;
        }

        let timeOver = function (lastTime) {
            return msToTime(moment().valueOf() - moment(lastTime).valueOf())
        }

        let renderRow = function (el) {
            let dataRow = [
                el.agentName ? el.agentName : '',
                el.customerName ? el.customerName : '',
                el.created ? moment(el.created).format('HH:mm DD/MM/YYYY') : '',
                checkThoiGian(el.checkFirstReply),
                el.lastTimeIn ? moment(el.lastTimeIn).format('HH:mm DD/MM/YYYY') : '',
                status == 'complete'
                    ?
                    (el.status ? convertStatus(el.status) : '')
                    :
                    el.checkLastReply != null && el.checkLastReply > 0 ? checkThoiGian(el.checkLastReply) : timeOver(el.lastTimeIn)
            ]

            let _td = `<td class="text-center">` + _stt + `</td>`;
            for (let i = 0; i < dataRow.length; i++) {
                _td += `<td class="text-center">` + dataRow[i] + `</td>`
            }
            _stt++;
            return _td;
        }


        let checkSLA = function (checkLastReply, lastTimeIn, sla) {
            let str = '';
            if (checkLastReply == null || checkLastReply < 0) moment().valueOf() - moment(lastTimeIn).valueOf() > 1000 * sla ? str = 'style="background-color:#FE8B79;border-bottom: 1px solid white"' : str;
            return str;
        }

        let htmlRow = '';
        resp.data.forEach(function (el) {
            console.log('SLA', timeOver(el.lastTimeIn));
            console.log('SLA2', checkThoiGian(el.checkLastReply), el.checkLastReply);

            if (_.isEmpty(el)) return;
            htmlRow +=
                `<tr id="showTd" ${checkSLA(el.checkLastReply, el.lastTimeIn, el.mailSLA)}>` +
                renderRow(el) +
                `<td class="text-center"><a role="button" data-id="` + (el ? el._id : ``) + `" data-form="complaint" href="javascript:void(0)" class="p-t-3 btn-flat-bg btn-show" data-toggle="tooltip" data-placement="top" data-original-title="Thông tin hội thoại"><i style="color:#3F8498" class="zmdi zmdi-eye  f-17"></i></a> </td>` +
                `</tr>`;
        });


        $('#tbl-data').html(htmlRow)
    }

    // truy vấn dữ liệu biểu đồ
    var getFilterChart = function (typeChart) {
        //typeChart: donut || bar
        let filter = { scope: typeChart }

        _Ajax("/dash-board-mail?" + $.param(filter), 'GET', {}, function (resp) {
            console.log('ahihi', resp);
            if (resp.code == 200) {
                if (typeChart == 'bar') loadChartBar(resp.data)
                if (typeChart == 'donut') loadChartDonut(resp.data);

            } else {
                console.log('Cảnh báo 1!', resp);
                swal({ title: 'Cảnh báo!', text: resp.message });
            }
        })
    };

    //render biểu đồ tròn
    var loadChartDonut = function (resp) {
        let dataConnect = 0;
        let dataMiss = 0;
        switch (typeDonut) {
            case 'day':
                if (resp.day[0]) {
                    dataConnect = resp.day[0].sumComplete;
                    $('#donutTotalComplete').text(dataConnect);
                    dataMiss = resp.day[0].sumInprogress;
                    $('#donutTotalInprogress').text(dataMiss);
                } else {
                    $('#donutTotalComplete').text(' -- ');
                    $('#donutTotalInprogress').text(' -- ');
                }
                break;
            case 'week':
                if (resp.week[0]) {
                    dataConnect = resp.week[0].sumComplete;
                    $('#donutTotalComplete').text(dataConnect);
                    dataMiss = resp.week[0].sumInprogress;
                    $('#donutTotalInprogress').text(dataMiss);
                } else {
                    $('#donutTotalComplete').text(' -- ');
                    $('#donutTotalInprogress').text(' -- ');
                }
                break;
            case 'month':
                if (resp.month[0]) {
                    dataConnect = resp.month[0].sumComplete;
                    $('#donutTotalComplete').text(dataConnect);
                    dataMiss = resp.month[0].sumInprogress;
                    $('#donutTotalInprogress').text(dataMiss);
                } else {
                    $('#donutTotalComplete').text(' -- ');
                    $('#donutTotalInprogress').text(' -- ');
                }
                break;
        }
        let optionsCircle = {
            series: [dataConnect, dataMiss],
            labels: ['Hoàn thành', 'Chưa hoàn thành'],
            chart: {
                height: 400,
                type: 'donut',
                // offsetY:0,
                toolbar: {
                    show: false,
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
            responsive: [{
                breakpoint: 1366,
                options: {
                    plotOptions: {
                        pie: {
                            customScale: 0.5,
                            donut: {
                                size: '80%'
                            }
                        }
                    },
                }
            }],
            fill: {
                colors: ['#FC8E10', '#C3E0EF']

            },
            plotOptions: {
                pie: {
                    customScale: 0.9,
                    donut: {
                        size: '80%'
                    }
                }
            },
            legend: {
                show: false,
                // colors: ['#FC8E10', '#C3E0EF']
                style: {
                    background: ['#FC8E10', '#C3E0EF']
                },
            }
        };
        $("#chartDonut").empty()
        let chart = new ApexCharts(document.querySelector("#chartDonut"), optionsCircle);
        chart.render();
        // $(".apexcharts-zoomable").attr('class', 'apexcharts-canvas apexchartspq4ep1au apexcharts-theme-light apexcharts-zoomable box-shadow1')
    }

    //render biểu đồ cột
    var loadChartBar = function (resp) {
        console.log(555555, resp.day[0]);

        let dataLabel = [];
        let dataCaseId = [];
        switch (typeBar) {
            case 'day':

                for (let i = 0; i < 24; i++) {
                    dataLabel.push(i < 10 ? '0' + i : i)
                    if (resp.day[0]) {
                        let _el = resp.day.filter(el => el._id == i)[0]
                        dataCaseId.push(_el ? _el.sum : 0);
                    }
                }
                break;
            case 'week':

                for (let i = 2; i <= 8; i++) {
                    dataLabel.push(i == 8 ? 'CN' : 'Thứ ' + i)
                    if (resp.week[0]) {
                        if (i == 8) {//chủ nhật data trả về giá trị bằng 1
                            let _el = resp.week.filter(el => el._id == 1)[0]
                            dataCaseId.push(_el ? _el.sum : 0);
                        } else {
                            let _el = resp.week.filter(el => el._id == i)[0]
                            dataCaseId.push(_el ? _el.sum : 0);
                        }
                    }
                }
                break;
            case 'month':

                for (let i = 1; i <= moment().daysInMonth(); i++) {
                    dataLabel.push((i < 10 ? '0' + i : i))
                    if (resp.month[0]) {
                        let _el = resp.month.filter(el => el._id == i)[0]
                        dataCaseId.push(_el ? _el.sum : 0);
                        // dataCaseId.push(5);
                    }
                }
                break;
        }

        let options = {
            series: [{
                name: 'Tiếp nhận',
                type: 'column',
                data: dataCaseId
            }],
            chart: {
                height: 400,
                type: 'bar',
                stacked: true,
                offsetY: 40,
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
                colors: ['#3E8416']

            },
            //màu border column
            colors: ['#3E8416'],
            //set width column
            plotOptions: {
                bar: {
                    columnWidth: typeBar == 'week' ? '20%' : '50%',
                }
            },
            stroke: {
                width: [1],
                curve: 'smooth',
            },
            xaxis: {
                categories: dataLabel,
                max: 31
            },
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
                offsetX: 40,
                //set color radio chú thích
                markers: {
                    radius: 0,
                    fillColors: ['#F98C0E']
                }
            }
        };
        $("#chart").empty()
        let chart = new ApexCharts(document.querySelector("#chart"), options);
        chart.render();
        console.log('ahiiiiiiiiii', $(".apexcharts-zoomable").attr('class'));
        // $(".apexcharts-zoomable").attr('class', 'apexcharts-canvas apexchartspq4ep1au apexcharts-theme-light apexcharts-zoomable box-shadow1')
    }

    //Truy vấn dữ liệu kênh mail
    var getFilterChannel = function (load) {
        let filter = _.chain($('.input'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) memo[el.name] = $(el).val();
                return memo;
            }, {}).value();

        filter['scope'] = 'channel';
        _Ajax("/dash-board-mail?" + $.param(filter), 'GET', {}, function (resp) {
            if (resp.code == 200) {
                if (!load) {
                    if (resp.data.channel.length) {

                        loadChannel(resp)

                    } else {
                        swal({
                            title: "Thông báo",
                            text: "Không tìm thấy dữ liệu monitor theo kênh",
                            type: "warning",
                            confirmButtonColor: "#DD6B55",
                            confirmButtonText: "Xác nhận!",
                            closeOnConfirm: true
                        }, function () {

                        });

                    }
                } else {
                    if (resp.data.channel.length) loadChannel(resp)
                }
            } else {
                console.log(22222222, resp);
                swal({ title: 'Cảnh báo!', text: resp.message });
            }
        })
    }

    //render dữ liệu kênh mail
    var loadChannel = function (resp) {
        console.log(11111111111111, resp);

        let data = resp.data
        let htmlContent = ''

        for (let i = 0; i < data.channel.length; i++) {
            let sumCompleteChannel = _.reduce(data.channel[i].agent, function (memo, el) { return memo += el.sumComplete }, 0);
            let sumUnCompleteChannel = _.reduce(data.channel[i].agent, function (memo, el) { return memo += el.sumUnComplete }, 0);;
            let htmlChannel = ''
            htmlContent += '' +
                `<div class="box-shadow2 p-20" style="width:48%">` +
                `   <div class="col-md-12 m-b-20 m-t-5 p-l-0 p-r-0 flex-box-align">` +
                `       <div class="col-md-6 p-0 " title="${data && data.channel[i] && data.channel[i].channelName ? data.channel[i].channelName : ''}">` +
                `           <span class="name-channel f-24">` +
                `               <strong>${data && data.channel[i] && data.channel[i].channelName ? data.channel[i].channelName : ''}</strong>` +
                `           </span>` +
                `       </div>` +
                `       <div class="col-md-6 p-r-0 flex-end">` +
                `           <div class="p-0 box-shadow2 flex-box-align m-r-15">` +
                `               <button type="button" class="btn btn-icon-text c-white text-center bgm-btn-channel btnComplete"` +
                `               channel-id="${data && data.channel[i] && data.channel[i]._id ? data.channel[i]._id : ''}">Hoàn thành</button>` +
                `               <p class="p-l-10 p-r-10 m-0">${sumCompleteChannel ? sumCompleteChannel : '--'}</p>` +
                `           </div>` +
                `           <div class="p-0 box-shadow2 flex-box-align">` +
                `               <button type="button" class="btn btn-icon-text c-white text-center bgm-btn-channel btnUnComplete"` +
                `               channel-id="${data && data.channel[i] && data.channel[i]._id ? data.channel[i]._id : ''}">Chưa hoàn thành</button>` +
                `               <p class="p-l-10 p-r-10 m-0">${sumUnCompleteChannel ? sumUnCompleteChannel : '--'}</p>` +
                `           </div>` +
                `       </div>` +
                `   </div>` +
                `   <hr style="width:100%; text-align:center; border-top: 1px solid #555555">` +
                `   <div class="tableFixHead">` +
                `       <table class="table table-striped table-hover">` +
                `           <thead>` +
                `               <tr>` +
                `                   <th colspan="2" scope="col">Agent</th>` +
                `                   <th class="text-center" scope="col">Trạng Thái</th>` +
                `                   <th class="text-center" scope="col">Hoàn Thành</th>` +
                `                   <th class="text-center" scope="col">Chưa Hoàn Thành</th>` +
                `               </tr>` +
                `           </thead>` +
                `           <tbody>` +
                renderAgent(data.channel[i].agent, data.channel[i]._id) +
                `           </tbody>` +
                `       </table>` +
                `   </div>` +
                `</div>`
            // console.log(renderAgent(data[i].agent));
            if (i % 2 == 1 || data.channel.length - 1 == i) {// mỗi hàng có 2 kênh, đến kênh có giá trị lẻ thì xuống dòng
                htmlChannel =
                    `<div class="p-30 flex-space-between" style="width:100%">` +
                    htmlContent +
                    `</div>`
                htmlContent = ''
            }

            $('#channelMail').html(htmlChannel)
        }
    }


    //render dữ liệu bảng agent trong kênh mail
    var renderAgent = function (data, channelId) {
        if (!data || data.length == 0) return ``
        let temp = ''
        data.forEach(function (item) {
            temp +=
                `<tr class="rowAgent" channel-id="${channelId}" agent-id="${item.idAgent}">` +
                `   <td colspan ="2" class="" title="${item.agentName ? item.agentName : ''} ` + `(${item.agentAcc ? item.agentAcc : ''})` + `">${item.agentName ? item.agentName : ''} ` + `(${item.agentAcc ? item.agentAcc : ''})` + `</td>` +
                `   <td class="text-center ${item.idAgentCisco}"><i class="zmdi zmdi-circle f-15 text-danger"></i></td>` +
                `   <td class="text-center">${item.sumComplete ? item.sumComplete : 0}</td>` +
                `   <td class="text-center">${item.sumUnComplete ? item.sumUnComplete : 0}</td>` +
                `</tr>`
        })
        return temp;
    }

    // query lên cisco lấy trạng thái của agent
    var getAgentStatus = function () {
        let filter = { scope: 'getAgentStatus' }
        _Ajax("/dash-board-mail?" + $.param(filter), 'GET', {}, function (resp) {
            console.log('Status agent', { resp });
            if (resp.code == 200 && resp.message.length) {
                renderStatus(resp.message)
            }
        })
    }

    var renderStatus = function (data) {
        data.forEach((item) => {
            // hiện tại đang check những giá trị này là online chat
            if (item.AgentState == 14 || item.AgentState == 12 || item.AgentState == 11) {
                $('.' + item.PeripheralNumber).find('.zmdi-circle').removeClass('text-danger')
                $('.' + item.PeripheralNumber).find('.zmdi-circle').addClass('text-success')
            } else {
                $('.' + item.PeripheralNumber).find('.zmdi-circle').addClass('text-danger')
                $('.' + item.PeripheralNumber).find('.zmdi-circle').removeClass('text-success')
            }
        })
    }

    var reload = function () {
        getFilterChart('donut');
        getFilterChart('bar');
        getFilterChannel(true);
        getFilterTotal();
        getAgentStatus();
        instanceInterval = setInterval(function () {
            getFilterChart('donut')
            getFilterChart('bar')
            getFilterChannel(true)
            getFilterTotal()
        }, 1000 * 60 * 60 * 15); // we're passing x
        instanceIntervalStatus = setInterval(function () {
            getAgentStatus();
        }, 5000);

    }

    // function percentFormat(_number) {
    //     // if(_number == 0) return 'N/A';
    //     return `${_number ? parseFloat((_number * 100).toFixed(2)) : _number} %`;
    // }
    return {
        init: function () {
            $('.container').attr('class', 'container-fluid')
            // bindValueTernal();
            bindClickDashBoard();
            reload();

            window.onbeforeunload = null;

            $('.selectpicker').selectpicker('refresh');
        },
        uncut: function () {

            // khi sang trang khác sẽ hủy interval --> sẽ ko chạy interval nữa
            if (instanceInterval) {
                console.log("clear instanceInterval");
                clearInterval(instanceInterval);
                instanceInterval = null;
            }
            if (instanceIntervalStatus) {
                console.log("clear instanceIntervalStatus");
                clearInterval(instanceIntervalStatus);
                instanceIntervalStatus = null;
            }
        }
    };
}(jQuery);