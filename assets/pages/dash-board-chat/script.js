var DFT = function ($) {
    // flag để dừng interval khi sang sang khác
    let instanceIntervalChart = null;
    let instanceIntervalStatus = null;
    let instanceIntervalChannel = null;
    let typeCampaign = 'day'
    let typeTotal = 'day'

    var bindClickDashBoard = function () {

        // Làm mới trang
        $(document).on('click', '.zmdi-refresh', function () {
            _.LoadPage(window.location.hash);
        });
        $(document).on('click', '#btn-search-channel', function () {
            getDataChannel();
        });

        // switch chart campaign
        $('input:radio[name="rdoCampaign"]').on('change', function () {
            if ($(this).is(':checked') && $(this).val() == 'dayCampaign') {
                getDataChartCampaign('day')
                typeCampaign = 'day'
            }
            if ($(this).is(':checked') && $(this).val() == 'weekCampaign') {
                getDataChartCampaign('week')
                typeCampaign = 'week'
            }
            if ($(this).is(':checked') && $(this).val() == 'monthCampaign') {
                getDataChartCampaign('month')
                typeCampaign = 'month'
            }
        })

        // switch chart total
        $('input:radio[name="rdoTotal"]').on('change', function () {
            if ($(this).is(':checked') && $(this).val() == 'dayTotal') {
                getDataChartTotal('day')
                typeTotal = 'day'
            }
            if ($(this).is(':checked') && $(this).val() == 'weekTotal') {
                getDataChartTotal('week')
                typeTotal = 'week'
            }
            if ($(this).is(':checked') && $(this).val() == 'monthTotal') {
                getDataChartTotal('month')
                typeTotal = 'month'
            }
        })


        // show popup chi tiết loại chat theo kênh
        $(document).on('click', '.btnReceive', function () {
            let idChannel = $(this).attr('data-id')
            let nameChannel = $(this).attr('data-name')
            getDataPopup('receive', idChannel, null, nameChannel)

        })
        $(document).on('click', '.btnWait', function () {
            let idChannel = $(this).attr('data-id')
            let nameChannel = $(this).attr('data-name')
            let idChannelCisco = $(this).attr('data-idChannel')
            let sla = $(this).attr('data-sla')
            getChatWait('wait', idChannel, nameChannel, idChannelCisco, sla)
            // getDataPopup('wait', idChannel, null, nameChannel)

        })
        $(document).on('click', '.btnOffline', function () {
            let idChannel = $(this).attr('data-id')
            let nameChannel = $(this).attr('data-name')
            getDataPopup('offline', idChannel, null, nameChannel)

        })
        $(document).on('click', '.btn-agentChannel', function () {
            let idChannel = $(this).attr('data-channel')
            let idAgent = $(this).attr('data-id')
            let nameAgent = $(this).attr('data-name')
            let nameChannel = $(this).attr('data-nameChannel')
            getDataPopup('agent', idChannel, idAgent, nameAgent, nameChannel)

        })
        // push notify cho agent
        $(document).on('click', '.notifyAgent', function () {
            let idAgent = $(this).attr('data-id');
            pushNotifyToAgent(idAgent)
        })
    };

    var pushNotifyToAgent = function (idAgent) {
        let filter = { idAgent: idAgent, scope: 'pushNotify' }
        _Ajax("/dash-board-chat?" + $.param(filter), 'GET', {}, function (resp) {

        })
    }
    // lấy data cuộc chat trên cisco
    var getChatWait = function (type, name, nameChannel, idChannelCisco, sla) {
        let filter = { idChannelCisco: idChannelCisco, scope: 'getChatWait' }
        _Ajax("/dash-board-chat?" + $.param(filter), 'GET', {}, function (resp) {

            renderPopup(resp.data, type, nameChannel, name, sla)
            $('#modal-form-input').modal({
                backdrop: 'static',
                'keyboard': false
            });
        })
    }
    // query lên cisco lấy trạng thái của agent
    var getStatusAgent = function () {
        let filter = { scope: 'getStatusAgent' }
        _Ajax("/dash-board-chat?" + $.param(filter), 'GET', {}, function (resp) {
            console.log('Status agent', { resp });
            if (resp.code == 200 && resp.message.length) {
                renderStatus(resp.message)
            }
        })
    }
    // get data đếm số lượng loại chat theo kênh
    var getDataCountChat = function (idAgent) {
        let filter = { refreshTime: moment().format('DD/MM/YYYY'), scope: 'getDataCountChat' }
        _Ajax("/dash-board-chat?" + $.param(filter), 'GET', {}, function (resp) {
            if (resp.code == 200 && resp.data.length) {
                renderCountChat(resp.data)
            }

        })
    }
    // query lên cisco đếm số lượng chat chờ
    var getDataCountChatWait = function (idChannelCisco) {
        let filter = { idChannelCisco: idChannelCisco, scope: 'getChatWait' }
        _Ajax("/dash-board-chat?" + $.param(filter), 'GET', {}, function (resp) {
            if (resp.code = 200 && resp.data.length > 0) {
                $('.' + idChannelCisco).html(resp.data.length)
            }
        })
    }

    // query data tổng quan
    var getDataOverview = function () {
        _Ajax("/dash-board-total-chat", 'GET', {}, function (resp) {
            if (resp.code == 200 && resp.message) {
                renderOverview(resp.message)
            } else {
                renderOverview()
            }
        })
    }

    // query dữ liệu hiển thị popup
    var getDataPopup = function (type, idChannel, idAgent, name, nameChannel) {

        let filter = { refreshTime: moment().format('DD/MM/YYYY'), scope: 'getDataPopup' }
        if (!type) {
            filter.type = 'receive'
        } else {
            filter.type = type
        }
        filter.idChannel = idChannel
        if (idAgent) {
            filter.idAgent = idAgent
        }
        _Ajax("/dash-board-chat?" + $.param(filter), 'GET', {}, function (resp) {
            console.log('bug', resp);

            if (resp.code == 200 && resp.data.length) {
                renderPopup(resp.data, resp.type, name, nameChannel)
                $('#modal-form-input').modal({
                    backdrop: 'static',
                    'keyboard': false
                });
            } else {
                renderPopup(null, resp.type, name, nameChannel);
                $('#modal-form-input').modal({
                    backdrop: 'static',
                    'keyboard': false
                });
            }
        })
    }

    // query dữ liệu chart campaign
    var getDataChartCampaign = function (unit) {

        let filter = { refreshTime: moment().format('DD/MM/YYYY'), scope: 'getDataChartCampaign' }
        if (!unit) {
            filter.unit = typeCampaign
        } else {
            filter.unit = unit
        }
        _Ajax("/dash-board-chat?" + $.param(filter), 'GET', {}, function (resp) {
            if (resp.code == 200 && resp.data.length) {
                loadChartCampaign(resp.data[0]);
            } else {
                loadChartCampaign();
            }
        })
    }

    // query dữ liệu chart total
    var getDataChartTotal = function (type) {
        let filter = { refreshTime: moment().format('DD/MM/YYYY'), scope: 'getDataChartTotal' }
        if (!type) {
            filter.type = typeTotal
        } else {
            filter.type = type
        }
        _Ajax("/dash-board-chat?" + $.param(filter), 'GET', {}, function (resp) {

            if (resp.code == 200 && resp.data.length) {
                loadChartTotal(resp)
            } else {
                loadChartTotal()
            }
        })
    }

    // query dữ liệu kênh chat
    var getDataChannel = function () {
        var filter = _.chain($('#searchChannel'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) memo[el.name] = $(el).val();
                return memo;
            }, {}).value();

        filter.scope = 'getDataChannel'
        filter.refreshTime = moment().format('DD/MM/YYYY')

        _Ajax("/dash-board-chat?" + $.param(filter), 'GET', {}, function (resp) {

            $('#sideChannelChat').empty()
            if (resp.code == 200 && resp.data.length) {
                renderChannelChat(resp.data)
            } else {
                renderChannelChat()
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

    // hiển thị dữ liệu màn hình tổng quan
    var renderOverview = function (data) {
        if (!data) {
            $('.since').addClass('d-none')
        }
        else {
            $('.since').removeClass('d-none')

            $('#textTotal').html(data.totalChat.dataCurrentMonth)
            if (data.totalChat.dataCurrentMonth >= data.totalChat.dataPreviousMonth) {
                $('#trendTotal').html(`<p class="m-0 lbc-green"><strong class="f-18"> <i class="zmdi zmdi-trending-up "></i>
                ${data.totalChat.percentage}%</strong></p>`)
            } else {
                $('#trendTotal').html(` <p class="m-0 c-red"><strong class="f-18"> <i class="zmdi zmdi-trending-down "></i>
                ${data.totalChat.percentage}%</strong></p>`)
            }

            $('#textReceive').html(data.totalChatReceive.dataCurrentMonth)
            if (data.totalChatReceive.dataCurrentMonth >= data.totalChatReceive.dataPreviousMonth) {
                $('#trendReceive').html(`<p class="m-0 lbc-green"><strong class="f-18"> <i class="zmdi zmdi-trending-up "></i>
                ${data.totalChatReceive.percentage}%</strong></p>`)
            } else {
                $('#trendReceive').html(` <p class="m-0 c-red"><strong class="f-18"> <i class="zmdi zmdi-trending-down "></i>
                ${data.totalChatReceive.percentage}%</strong></p>`)
            }

            $('#textMiss').html(data.totalChatMiss.dataCurrentMonth)
            if (data.totalChatMiss.dataCurrentMonth >= data.totalChatMiss.dataPreviousMonth) {
                $('#trendMiss').html(`<p class="m-0 lbc-green"><strong class="f-18"> <i class="zmdi zmdi-trending-up "></i>
                ${data.totalChatMiss.percentage}%</strong></p>`)
            } else {
                $('#trendMiss').html(` <p class="m-0 c-red"><strong class="f-18"> <i class="zmdi zmdi-trending-down "></i>
                ${data.totalChatMiss.percentage}%</strong></p>`)
            }

            $('#textOffline').html(data.totalChatOffline.dataCurrentMonth)
            if (data.totalChatOffline.dataCurrentMonth >= data.totalChatOffline.dataPreviousMonth) {
                $('#trendOffline').html(`<p class="m-0 lbc-green"><strong class="f-18"> <i class="zmdi zmdi-trending-up "></i>
                ${data.totalChatOffline.percentage}%</strong></p>`)
            } else {
                $('#trendOffline').html(` <p class="m-0 c-red"><strong class="f-18"> <i class="zmdi zmdi-trending-down "></i>
                ${data.totalChatOffline.percentage}%</strong></p>`)
            }
        }


    }

    // render popup
    var renderPopup = function (data, type, name, nameChannel, sla) {
        var title = '';
        if (type == 'receive' || type == 'agent') {
            if (type == 'receive') title = 'Chăm sóc'
            if (type == 'agent') {
                title = name ? `Agent : ${name}` : ''
                name = nameChannel
            }
            var content =
                `<div class="modal-dialog" role="document" style="width:60%;padding-top:80px">` +
                `<div class="modal-content" style="max-height:450px">` +
                `    <div class="modal-header modal-popup-store p-10" style="background-color: #5AAFC8 ;">` +
                `        <div class="row m-t-0 m-b-0">` +
                `           <div class="col-sm-10">` +
                `               <h4 class="modal-title c-white" id="modal-form-input-complaint-label">${name} - ${title}` +
                `               </h4>` +
                `           </div>` +
                `           <div class="col-sm-2"><button type="button" class="close btn-resta-modal-form-close"` +
                `                   data-dismiss="modal" aria-label="Close"><span aria-hidden="true">×</span><span` +
                `                       class="sr-only">Close</span> </button></div>` +
                `       </div>` +
                `   </div>` +


                `   <div class="modal-body p-0" id="modal-ticket" style="max-height:360px">` +
                `       <!-- <div class="container-fluid"> -->` +
                `       <div class="panel-body p-0">` +
                `           <div class="text-center alert hide" id="text-form-input-alert"></div>` +
                `           <form id="form-modal-custom" class="form-horizontal">` +
                `               <div class="tableFixHeadPopup">` +
                `                   <table class="table table-hover">` +
                `                       <thead>` +
                `                           <tr>` +
                `                               <th class="text-center" scope="col">STT</th>` +
                `                               <th class="text-center" scope="col">Agent</th>` +
                `                               <th class="text-center" scope="col">Khách hàng</th>` +
                `                               <th class="text-center" scope="col">Thời điểm bắt đầu</th>` +
                `                               <th class="text-center" scope="col">Thời gian chờ</th>` +
                `                               <th class="text-center" scope="col">Thời gian chat</th>` +
                `                               <th class="text-center" scope="col">Tác vụ</th>` +
                `                           </tr>` +
                `                       </thead>` +
                `                       <tbody>` +
                renderRowpopup(data, type) +
                `                       </tbody>` +
                `                   </table>` +
                `               </div>` +

                `           </form>` +
                `       </div>` +
                `       <!-- </div> -->` +
                `   </div>` +
                `</div>` +
                `</div>`
            $('#modal-form-input').html(content)

        }
        if (type == 'wait') {
            var content =
                `<div class="modal-dialog" role="document" style="width:60%;padding-top:80px">` +
                `<div class="modal-content" style="max-height:450px">` +
                `    <div class="modal-header modal-popup-store p-10" style="background-color: #5AAFC8 ;">` +
                `        <div class="row m-t-0 m-b-0">` +
                `           <div class="col-sm-10">` +
                `               <h4 class="modal-title c-white" id="modal-form-input-complaint-label">${name} - Hàng đợi` +
                `               </h4>` +
                `           </div>` +
                `           <div class="col-sm-2"><button type="button" class="close btn-resta-modal-form-close"` +
                `                   data-dismiss="modal" aria-label="Close"><span aria-hidden="true">×</span><span` +
                `                       class="sr-only">Close</span> </button></div>` +
                `       </div>` +
                `   </div>` +


                `   <div class="modal-body p-0" id="modal-ticket" style="max-height:360px">` +
                `       <!-- <div class="container-fluid"> -->` +
                `       <div class="panel-body p-0">` +
                `           <div class="text-center alert hide" id="text-form-input-alert"></div>` +
                `           <form id="form-modal-custom" class="form-horizontal">` +
                `               <div class="tableFixHeadPopup">` +
                `                   <table class="table table-hover">` +
                `                       <thead>` +
                `                           <tr>` +
                `                               <th class="text-center" scope="col">STT</th>` +
                `                               <th class="text-center" scope="col">Khách hàng</th>` +
                `                               <th class="text-center" scope="col">Thời điểm bắt đầu</th>` +
                `                               <th class="text-center" scope="col">Thời gian chờ</th>` +
                `                           </tr>` +
                `                       </thead>` +
                `                       <tbody>` +
                renderRowpopup(data, type, sla) +
                `                       </tbody>` +
                `                   </table>` +
                `               </div>` +

                `           </form>` +
                `       </div>` +
                `       <!-- </div> -->` +
                `   </div>` +
                `</div>` +
                `</div>`

            $('#modal-form-input').html(content)

        }
        if (type == 'offline') {
            var content =
                `<div class="modal-dialog" role="document" style="width:60%;padding-top:80px">` +
                `<div class="modal-content" style="max-height:450px">` +
                `    <div class="modal-header modal-popup-store p-10" style="background-color: #5AAFC8 ;">` +
                `        <div class="row m-t-0 m-b-0">` +
                `           <div class="col-sm-10">` +
                `               <h4 class="modal-title c-white" id="modal-form-input-complaint-label">${name} - Offline` +
                `               </h4>` +
                `           </div>` +
                `           <div class="col-sm-2"><button type="button" class="close btn-resta-modal-form-close"` +
                `                   data-dismiss="modal" aria-label="Close"><span aria-hidden="true">×</span><span` +
                `                       class="sr-only">Close</span> </button></div>` +
                `       </div>` +
                `   </div>` +


                `   <div class="modal-body p-0" id="modal-ticket" style="max-height:360px">` +
                `       <!-- <div class="container-fluid"> -->` +
                `       <div class="panel-body p-0">` +
                `           <div class="text-center alert hide" id="text-form-input-alert"></div>` +
                `           <form id="form-modal-custom" class="form-horizontal">` +
                `               <div class="tableFixHeadPopup">` +
                `                   <table class="table table-hover">` +
                `                       <thead>` +
                `                           <tr>` +
                `                               <th class="text-center" scope="col">STT</th>` +
                `                               <th class="text-center" scope="col">Khách hàng</th>` +
                `                               <th class="text-center" scope="col">Thời điểm bắt đầu</th>` +
                `                               <th class="text-center" scope="col">Thời gian chờ</th>` +
                `                           </tr>` +
                `                       </thead>` +
                `                       <tbody>` +
                renderRowpopup(data, type) +
                `                       </tbody>` +
                `                   </table>` +
                `               </div>` +

                `           </form>` +
                `       </div>` +
                `       <!-- </div> -->` +
                `   </div>` +
                `</div>` +
                `</div>`
            $('#modal-form-input').html(content)

        }


    }

    var renderRowpopup = function (data, type, sla) {
        if (!data) return ``;
        let text = ''
        if (type == 'receive' || type == 'agent') {
            data.forEach((item, i) => {
                let warnClass = ''
                // Đk1: Hội thoại tiếp nhận/Tin nhắn cuối cùng là của KH/Phiên chat chưa kết thúc
                // Thời gian chờ rep của tin nhắn cuối cùng > SLA Thời gian chờ giữa các tin nhắn

                if (item.activityStatus != 9000 && _.has(item, 'lastMessage') && item.lastMessage.type == 'customer'
                    && (moment.duration(moment(new Date()).diff(moment(item.lastMessage.createAt))).asSeconds() > item.slaTimeWait)) {
                    warnClass = 'over-deadline'
                }
                // Đk2: Hội thoại tiếp nhận/Thời lượng hội thoại > SLA thời lượng hội thoại
                else if (item.activityStatus != 9000 &&
                    moment.duration(moment(item.whenModified).diff(moment(item.createDate))).asSeconds() > item.slaTimeConversation) {
                    warnClass = 'over-deadline'
                }
                text +=
                    `       <tr class="${warnClass}">` +
                    `           <th class="text-center" scope="row">${i + 1}</th>` +
                    `           <td class="text-center" title="${item.agent ? item.agent : ''}">${item.agent ? item.agent : ''}</td>` +
                    `           <td class="text-center" title="${item.customer ? item.customer : ''}">${item.customer ? item.customer : ''}</td>` +
                    `           <td class="text-center">${item.createDate ? moment(item.createDate).format('HH:mm DD/MM/YYYY') : ''}</td>` +
                    `           <td class="text-center">${item.waitTime ? hms(item.waitTime) : 0}</td>` +
                    `           <td class="text-center">${item.chatTime ? hms(item.chatTime) : 0}</td>` +
                    `           <td class="text-center"><a role="button" data-id="${item.agentId}" class="notifyAgent"><i class="zmdi zmdi-notifications-add f-16"></i></a></td>` +
                    `       </tr>`
            })
            return text;

        }
        if (type == 'wait') {
            data.forEach((item, i) => {

                let slaTime = sla | 0

                let waitTime = moment(new Date()).diff(moment(item.created))

                let warnClass = ''
                // DDk: Hội thoại chờ/Thời gian chờ > SLA Thời gian tiếp nhận/Phiên chat chưa kết thúc
                if (item.activityStatus != 9000 && moment.duration(waitTime).asSeconds() > slaTime) {
                    warnClass = 'over-deadline'
                }
                text +=
                    `       <tr class="${warnClass}">` +
                    `           <th class="text-center" scope="row">${i + 1}</th>` +
                    `           <td class="text-center" title="${item.nameCustomer ? item.nameCustomer : ''}">${item.nameCustomer ? item.nameCustomer : ''}</td>` +
                    `           <td class="text-center">${item.created ? moment(item.created).format('HH:mm DD/MM/YYYY') : ''}</td>` +
                    `           <td class="text-center">${waitTime ? hms(waitTime) : 0}</td>` +
                    `       </tr>`
            })

            return text;
        }
        if (type == 'offline') {
            data.forEach((item, i) => {
                text +=
                    `       <tr>` +
                    `           <th class="text-center" scope="row">${i + 1}</th>` +
                    `           <td class="text-center" title="${item.customer ? item.customer : ''}">${item.customer ? item.customer : ''}</td>` +
                    `           <td class="text-center">${item.createDate ? moment(item.createDate).format('HH:mm DD/MM/YYYY') : ''}</td>` +
                    `           <td class="text-center">${item.waitTime ? hms(item.waitTime) : 0}</td>` +
                    `       </tr>`
            })
            return text;
        }

    }

    // render kênh chat
    var renderChannelChat = function (data) {

        if (!data) return;
        let tempTable = ''
        for (let i = 0; i < data.length; i++) {
            getDataCountChatWait(data[i].idChannelCisco)
            let templeChannel = ''
            tempTable += `    <div class="box-shadow p-20" style="width:48%">` +
                `        <div class="col-md-12 m-b-13 p-l-0 p-r-0" id="${data[i]._id}">` +
                `            <div class="col-md-4 p-0 " title="${data[i].name ? data[i].name : ''}">` +
                `                <span class="name-channel">` +
                `                    <strong>` +
                `                        ${data[i].name ? data[i].name : ''}` +
                `                    </strong>` +
                `                </span>` +
                `            </div>` +
                `            <div class="col-md-8 p-r-0">` +
                `                <div class="col-md-4 p-0 box-shadow">` +
                `                    <button type="button"  data-name="${data[i].name}" data-id="${data[i]._id}" style="width: 70%;background-color: #53A83F;"` +
                `                        class="btn btn-icon-text c-white p-l-6 btnReceive ">Chăm sóc</button>` +
                `                    <span class="m-l-13" id="countReceive">0</span>` +

                `                </div>` +
                `                <div class="col-md-4 p-0 box-shadow">` +
                `                    <button type="button" data-sla="${data[i].slaTimeReceive}"  data-idChannel="${data[i].idChannelCisco}" data-name="${data[i].name}" data-id="${data[i]._id}" style="width: 70%;background-color: #FC8E10;"` +
                `                        class="btn btn-icon-text c-white btnWait">Chờ</button>` +
                `                    <span class="m-l-13 ${data[i].idChannelCisco}" id="countWait">0</span>` +

                `               </div>` +
                `                <div class="col-md-4 p-0 box-shadow">` +
                `                   <button type="button" data-name="${data[i].name}" data-id="${data[i]._id}" style="width: 70%;background-color: #767876;"` +
                `                       class="btn btn-icon-text c-white btnOffline ">Offline</button>` +
                `                   <span class="m-l-10" id="countOffline">0</span>` +

                `               </div>` +

                `           </div>` +
                `       </div>` +
                `       <hr style="width:90%;text-align:center;border-top: 1px solid #555555">` +
                `       <div class="tableFixHead">` +
                `           <table class="table table-striped">` +
                `               <thead>` +
                `                   <tr>` +
                `                       <th class="text-center w-200">Agent</th>` +
                `                       <th class="text-center" scope="col">Trạng thái</th>` +
                `                       <th class="text-center" scope="col">Đang chăm sóc</th>` +
                `                   </tr>` +
                `               </thead>` +
                `               <tbody>` +
                renderAgent(data[i]) +

                `               </tbody>` +
                `           </table>` +
                `       </div>` +
                `   </div>`
            // console.log(renderAgent(data[i].agent));

            if (i % 2 == 1 || data.length - 1 == i) {// mỗi hàng có 2 kênh, đến kênh có giá trị lẻ thì xuống dòng
                templeChannel =
                    `<div class="p-30 flex-space-between" style="width:100%">` +
                    tempTable +
                    `</div>`
                tempTable = ''
            }
            $('#sideChannelChat').append(templeChannel)
            countReceive = 0;
            countWait = 0;
            countOffline = 0;
        }
    }

    var renderCountChat = function (data) {
        if (!data) return;
        data.forEach((item) => {
            $('#' + item._id).find('#countReceive').html(_.compact(item.receive).length)
            $('#' + item._id).find('#countOffline').html(_.compact(item.offline).length)
            // $('#' + item._id).find('#countWait').html(_.compact(item.wait).length)
        })
    }

    var renderAgent = function (data) {
        if (!data || !data.agent || data.length == 0) return ``
        let temp = ''
        data.agent.forEach(function (item) {
            temp +=
                `               <tr>` +
                `                   <th role="button" data-channel="${data._id}" data-nameChannel="${data.name}" data-id="${item.idAgent}" data-name="${item.displayNameAgent}" class="text-center name-agent w-200 btn-agentChannel" title="${item.displayNameAgent ? item.displayNameAgent : ''} ` + `(${item.nameAgent ? item.nameAgent : ''})` + `">${item.displayNameAgent ? item.displayNameAgent : ''} ` + `(${item.nameAgent ? item.nameAgent : ''})` + `</th>` +
                `                   <th class="text-center ${item.idAgentCisco}"><i class="zmdi zmdi-circle f-18 text-danger"></i></th>` +
                `                   <th class="text-center">${item.receive ? item.receive.length : 0}</th>` +
                `               </tr>`
        })
        return temp;
    }

    // render biểu đồ campaign
    var loadChartCampaign = function (data) {
        var series;
        let dataLabel = ['Tiếp nhận', 'Nhỡ', 'Offline'];

        if (data) {
            let dataReceive = data.converReceive ? _.compact(data.converReceive).length : 0;
            let dataMiss = data.converMiss ? _.compact(data.converMiss).length : 0;
            let dataOffline = data.converOffline ? _.compact(data.converOffline).length : 0;
            series = [dataReceive, dataMiss, dataOffline]
            $('#receiveCampaign').text(dataReceive)
            $('#missCampaign').text(dataMiss)
            $('#offlineCampaign').text(dataOffline)
        } else {
            series = [0, 0, 0]
            $('#receiveCampaign').text('--')
            $('#missCampaign').text('--')
            $('#offlineCampaign').text('--')
        }

        let options = {
            series: series,
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
            plotOptions: {
                pie: {
                    customScale: 0.9,
                    donut: {
                        size: '80%'
                    }
                }
            },
            fill: {
                colors: ['#FC8E10', '#346D92', '#C3E0EF']

            },
            legend: {
                show: false
            },
            labels: dataLabel,
        };
        $("#chartCampaign").empty()
        let chart = new ApexCharts(document.querySelector("#chartCampaign"), options);
        chart.render();
        // $(".apexcharts-zoomable").attr('class', 'apexcharts-canvas apexchartspq4ep1au apexcharts-theme-light apexcharts-zoomable box-shadow1')
    }

    // render biểu đồ total
    var loadChartTotal = function (resp) {

        let dataLabel = [];
        let dataSeries = []

        if (resp) {
            let type = typeTotal

            if (type == 'day') {
                for (let i = 0; i < 24; i++) {
                    dataLabel.push(i < 10 ? '0' + i : i)
                    let _el = resp.data.filter(el => el._id == i)[0]
                    dataSeries.push(_el ? _.compact(_el.count).length : 0)
                }
            }
            if (type == 'week') {
                for (let i = 2; i <= 8; i++) {
                    dataLabel.push(i == 8 ? 'CN' : 'Thứ ' + i)
                    if (i == 8) {//chủ nhật data trả về giá trị bằng 1
                        let _el = resp.data.filter(el => el._id == i)[0]
                        dataSeries.push(_el ? _.compact(_el.count).length : 0);
                    } else {
                        let _el = resp.data.filter(el => el._id == i)[0]
                        dataSeries.push(_el ? _.compact(_el.count).length : 0);
                    }
                }
            }
            if (type == 'month') {
                for (let i = 1; i <= moment().daysInMonth(); i++) {
                    dataLabel.push((i < 10 ? '0' + i : i))
                    let _el = resp.data.filter(el => el._id == i)[0]
                    dataSeries.push(_el ? _.compact(_el.count).length : 0);
                }
            }
        }

        var options = {
            series: [{
                name: 'Số lượng',
                data: dataSeries
            }],
            chart: {
                type: 'bar',
                height: 400,
                offsetY: 40,
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
                colors: ['#3E8416']
            },
            //màu border column
            colors: ['#3E8416'],
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: typeTotal == 'week' ? '20%' : '50%',
                },
            },
            dataLabels: {
                enabled: false
            },
            stroke: {
                width: [1, 1, 1],
                curve: 'smooth',
            },
            xaxis: {
                categories: dataLabel,
            },
            tooltip: {
                y: {
                    formatter: function (val) {
                        return val
                    }
                }
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

        $("#chartTotal").empty()
        let chart = new ApexCharts(document.querySelector("#chartTotal"), options);
        chart.render();
        $(".apexcharts-zoomable").attr('class', 'apexcharts-canvas apexchartspq4ep1au apexcharts-theme-light apexcharts-zoomable box-shadow1')
    }

    function hms(secs) {
        if (isNaN(secs)) return "00:00:00"
        var sec = Math.ceil(secs / 1000);
        var minutes = Math.floor(sec / 60);
        sec = sec % 60;
        var hours = Math.floor(minutes / 60)
        minutes = minutes % 60;
        return hours + ":" + pad(minutes) + ":" + pad(sec);
    }

    function pad(num) {
        return ("0" + num).slice(-2);
    }



    var reload = function () {
        getDataChartCampaign()
        getDataChartTotal()
        getDataChannel()
        getDataOverview()
        getDataCountChat();
        getStatusAgent();


        instanceIntervalChart = setInterval(function () {
            getDataChartCampaign()
            getDataOverview()
            getDataChannel()
        }, 10000); // we're passing x

        instanceIntervalStatus = setInterval(function () {
            getStatusAgent();
            getDataCountChat()
        }, 5000); // we're passing x

        instanceIntervalChannel = setInterval(function () {

            getDataOverview()
            getDataChartTotal()
        }, 30000); // we're passing x

    }

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
            if (instanceIntervalChart) {
                clearInterval(instanceIntervalChart);
                instanceIntervalChart = null;
            }
            if (instanceIntervalStatus) {
                clearInterval(instanceIntervalStatus);
                instanceIntervalStatus = null;
            }
            if (instanceIntervalChannel) {
                clearInterval(instanceIntervalChannel);
                instanceIntervalChannel = null;
            }
        }
    };
}(jQuery);