var DFT = function ($) {
    /**
    * Hiển thị tên trường/cột theo file config
    */
    var indexTable = [];
    var bindValueChat = function () {
        _.each(_.allKeys(_config.MESSAGE.REPORT_STATISTIC_MAIL), function (item, i) {
            if (i < _.allKeys(_config.MESSAGE.REPORT_STATISTIC_MAIL).length - 1) {
                indexTable.push(i)
            }

        });
    };
    // Hiển thị tên cột theo file config
    function bindTextValue() {
        let temp = [];
        _.each(_.allKeys(_config.MESSAGE.REPORT_STATISTIC_MAIL), function (item) {
            let obj = $('.' + item);
            if (obj.prop('tagName')) {
                obj.html(_config.MESSAGE.REPORT_STATISTIC_MAIL[item]);

                let index = obj.closest('th').index();
                temp[index] = '<li class="p-l-15 p-r-20 b-b"> ' +
                    // '<input type="checkbox" id="" class="list-trieu-chung" />' +
                    '<div class="checkbox m-0 p-t-3 p-b-10">' +
                    '<label class="dp-block"> ' +
                    '<input type="checkbox" class="select-box column-display bgm-white text-right" data-index="' + index + '" checked>' +
                    '<i class="input-helper c-white"></i>' +
                    '<a class="p-l-5 text-capitalize text-nowrap c-white text-right dp-block">' + _config.MESSAGE.REPORT_STATISTIC_MAIL[item] + '</a>' +
                    '</input>' +
                    '</label>' +
                    '</div>' +
                    '</li>';
            }
        });

        $('#showHideFields').html(temp.join(''));
    };

    // Hiển thị tên header theo file config
    function bindThValue() {
        let temp = '';
        _.each(_.allKeys(_config.MESSAGE.REPORT_STATISTIC_MAIL), function (item, i) {
            temp += '<th class="bgm-confix-header c-white text-center"><span class=' + item + '>' + _config.MESSAGE.REPORT_STATISTIC_MAIL[item] + '</span></th> '
        });
        $('#showTh').html(temp);
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
            getFilterChat(true, false);
        });

        // Làm mới trang
        $(document).on('click', '.zmdi-refresh', function () {
            _.LoadPage(window.location.hash);
        });

        // download Excel
        $(document).on('click', '#btnExport', function (e) {
            getFilterChat(true, true);
        });

        // Thay đổi cột hiển thị báo cáo
        $(document).on('change', '.column-display', function (e) {
            let dataIndex = $(this).attr('data-index');
            let checked = $(this).is(":checked");

            _.each($('#showTh th'), function (el) {
                let indexTh = $(el).index();

                if (indexTh == dataIndex) {
                    if (checked) {
                        if (indexTable.indexOf(Number(dataIndex)) > -1) {
                            let _indexOf = indexTable.indexOf(Number(dataIndex))
                            indexTable.splice(_indexOf, 1)
                        }
                        $(el).show();
                    } else {
                        indexTable.push(Number(dataIndex))
                        $(el).hide();
                    }
                }
            });
            console.log('indexTable', indexTable);

            _.each($('#showTd td'), function (el) {
                let indexTd = $(el).index();
                if (indexTd == dataIndex) {
                    if (checked) {
                        $(el).show();
                    } else {
                        $(el).hide();
                    }
                }
            })
            //xử lý scrollx table
            let _num = _.allKeys(_config.MESSAGE.REPORT_STATISTIC_MAIL).length - indexTable.length
            if (_num < 10) {
                $('#exceldata').attr('class', 'table table-hover table-condensed table-bordered table-fix table-striped')
            } else {
                $('#exceldata').attr('class', 'table table-hover table-condensed table-bordered table-fix table-striped exceldata')
            }
        });


        // query lấy dữ liệu lịch sử chat
        $(document).on('click', '.btn-show', function (e) {
            let filter = {}
            filter.scope = 'search-history-mail'
            filter.idChat = $(this).attr('data-id')
            _Ajax("/report-statistic-mail?" + $.param(filter), 'GET', {}, function (resp) {
                if (resp.code == 200) {
                    loadHistory(resp)
                } else {
                    swal({ title: 'Cảnh báo !', text: resp.message });
                }
            })

            // open modal
            $('#modal-form-box-chat').modal({
                backdrop: 'static',
                'keyboard': false
            });
            // close modal
            $('#modal-form-box-chat').on('hidden.bs.modal', function (e) {
                $('#first-tab').trigger('click')
                $('#pills-tabContent').empty()
            })
        })

        //chọn nhóm tình trạng show tình trạng
        $('#reasonCategories').on('change', function () {
            let filter = {}
            filter.category = $(this).val()
            filter.scope = 'searchReason'
            _Ajax("/report-statistic-mail?" + $.param(filter), 'GET', {}, function (resp) {
                console.log({ resp });
                $('#ticketreasons').val('')
                $('#ticketreasons').empty()
                $('#ticketreasons').selectpicker('refresh');
                if (resp.code == 200 && resp.data.length) {
                    loadOptionReason(resp.data)
                }
            })
        })
    };

    var loadOptionReason = function (data) {
        $('#ticketreasons').val('')
        $('#ticketreasons').empty()
        $('#ticketreasons').append('<option value="" >---- Chọn ----</option>')
        data.forEach(function (item) {
            item.tReason.forEach(function (el) {
                $('#ticketreasons').append('<option value="' + el.trId + '">' + el.name + '</option>');
            })
        })
        $('#ticketreasons').selectpicker('refresh');
    }



    var hideColumn = function (lstIndexTable) {
        _.each($('#showTh th'), function (el) {
            let indexTh = $(el).index();
            if (lstIndexTable.indexOf(indexTh) != -1) {
                $(el).hide();
            }
        });

        _.each($('#showTd td'), function (el) {
            let indexTd = $(el).index();
            if (lstIndexTable.indexOf(indexTd) != -1) {
                $(el).hide();
            }
        })
    }


    var convertStatus = function (n) {
        switch (Number(n)) {
            // case 0:
            //     return 'Chờ xử lý';
            // case 1:
            //     return 'Đang xử lý';
            case 2:
                return 'Hoàn thành';
            default:
                return 'Chưa hoàn thành';
        }
    }
    // Lấy dữ liệu lọc và truy vấn server
    var getFilterChat = function (load, exportExcel, page) {
        console.log('check loop');

        var filter = _.chain($('.input'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) memo[el.name] = $(el).val();
                return memo;
            }, {}).value();
        console.log('filter', filter);
        console.log('exportExcel', exportExcel);
        console.log('ternal', $('#ternal').val());

        if (page) filter['page'] = page;
        // if ($) filter['page'] = page;
        if (exportExcel == true) {
            filter['exportExcel'] = exportExcel;
            filter['indexTable'] = indexTable;
        }

        if (load) {
            _Ajax("/report-statistic-mail?" + $.param(filter), 'GET', {}, function (resp) {
                console.log('ahihi', resp);
                if (resp.code == 200) {
                    console.log('ahuhi')
                    $('#body-table').empty();
                    if (resp.data.length) {
                        console.log(resp.data.length);
                        let total = document.querySelector('.totalChat');
                        if (total) {
                            total.remove();
                        }
                        $('#pagingChat').empty();
                        loadDataChat(resp);
                        loadSum(resp);
                        hideColumn(indexTable);
                        $('#pagingChat').append(_.paging('#report-statistic-mail', resp.paging));
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
                    console.log(22222222, resp);
                    swal({ title: 'Cảnh báo!', text: resp.message });
                }
            })
        } else {
            _Ajax("/report-statistic-mail?" + $.param(filter), 'GET', {}, function (resp) {
                console.log('ahihi1', resp);
                if (resp.code == 200) {
                    $('#body-table').empty();
                    if (resp.data.length) {
                        console.log(resp.data.length);
                        let total = document.querySelector('.totalChat');
                        if (total) {
                            total.remove();
                        }
                        $('#pagingChat').empty();
                        loadDataChat(resp);
                        loadSum(resp);
                        hideColumn(indexTable);
                        $('#pagingChat').append(_.paging('#report-statistic-mail', resp.paging));
                    }
                } else {
                    console.log(22222222, resp);
                    swal({ title: 'Cảnh báo!', text: resp.message });
                }
            })
        }

    };



    // Hiển thị dữ liệu lên giao diện
    var loadDataChat = function (resp) {
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

        let renderRow = function (el) {
            let template =
                '<td class="text-center">{0}</td>' +
                '<td class="text-center">{1}</td>' +
                '<td class="text-center">{2}</td>' +
                '<td class="text-center">{3}</td>' +
                '<td class="text-center">{4}</td>' +
                '<td class="text-center">{5}</td>' +
                '<td class="text-center">{6}</td>' +
                '<td class="text-center">{7}</td>' +
                '<td class="text-center">{8}</td>' +
                '<td class="text-center">{9}</td>' +
                '<td class="text-center">{10}</td>' +
                '<td class="text-center">{11}</td>' +
                '<td style="max-width:150px">{12}</td>'

            let _td = '';
            _td += template.str(
                el.created ? moment(el.created).format('HH:mm:ss DD/MM/YYYY') : '',
                el.customerName ? el.customerName : '',
                el.customerPhone ? el.customerPhone : '',
                el.customerEmail ? el.customerEmail : '',
                el.aliasName ? el.aliasName : '',
                el.subject ? el.subject : '',
                el.totalMail ? el.totalMail : '',
                el.reasonCategory ? el.reasonCategory : '',
                el.reason ? el.reason : '',
                // el.status,
                el.status != null ? convertStatus(el.status) : '',
                el.deadline ? moment(el.deadline).format('DD/MM/YYYY') : '',
                el.agentName ? el.agentName : '',
                el.note ? el.note : ''
            );
            return _td;
        }

        var rows = '';
        resp.data.forEach(function (el) {
            if (_.isEmpty(el)) return;
            rows +=
                '<tr id="showTd">' +
                renderRow(el) +
                '<td class="text-center"><a role="button" data-id="' + (el ? el._id : '') + '" data-form="complaint" href="javascript:void(0)" class="p-t-3 btn-flat-bg btn-show" data-toggle="tooltip" data-placement="top" data-original-title="Thông tin hội thoại"><i style="color:#3F8498" class="zmdi zmdi-eye  f-17"></i></a> </td>' +
                '</tr>';
        });

        $('#body-table').html(rows);
        window.MainContent.loadTooltip();
    };

    var loadSum = function (resp) {

        let _el = resp.sum
        var sumRows = '';
        let total = '<tr class="text-center m-t-5 ">' +
            '<td class="bgm-sum c-white"><strong>TỔNG SỐ KHÁCH HÀNG</strong></td>' +
            '<td class="c-black"><strong>{0}</strong></td>' +
            '<td class="bgm-sum c-white"><strong>TỔNG SỐ LUỒNG MAIL</strong></td>' +
            '<td class="c-black"><strong>{1}</strong></td>' +
            '<td class="bgm-sum c-white"><strong>TỔNG SỐ MAIL</strong></td>' +
            '<td class="c-black"><strong>{2}</strong></td>' +
            '<td class="bgm-sum c-white"><strong>HOÀN THÀNH</strong></td>' +
            '<td class="c-black"><strong>{3}</strong></td>' +
            '<td class="bgm-sum c-white"><strong>CHƯA HOÀN THÀNH</strong></td>' +
            '<td class="c-black"><strong>{4}</strong></td>' +
            '</tr>'

        sumRows += total.str(_el.sumCustomer, _el.sumCase, _el.sumMail, _el.sumComplete, _el.sumUnComplete)
        $('#thead-table').html(sumRows);
        window.MainContent.loadTooltip();
    }
    // hiển thị lịch sử chat
    var loadHistory = function (resp) {
        console.log(6666666666, resp);
        let _el = resp.data;
        $('#pills-tabContent').empty()

        let templateBoxChat =

            `<div role="tabpanel" class="tab-pane active" id="tab-list-chat">` +

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
            showMessage(resp.data) +
            `           </div>` +
            `</div>` +
            `   </div>` +
            `</div>`
        let templateInfo =
            `<div role="tabpanel" class="tab-pane " id="tab-info-chat">` +
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


        $('#pills-tabContent').append(templateBoxChat)
        $('#pills-tabContent').append(templateInfo)
    }



    // hiển thị tin nhắn lịch sử chat
    var showMessage = function (data) {
        let listMessage = '';
        if (!data) return ``
        console.log(777777, data);

        data.caseId.forEach(function (item) {
            if (Number(item.activitySubType) == 1) {//customer
                listMessage +=
                    `<div class="row msg_container base_sent " style="padding:0">` +
                    `   <div class="col-md-12 col-xs-12 flex-start">` +
                    `       <div>[${moment(item.whenCreated).format('HH:mm - DD/MM/YYYY')}]&nbsp;&nbsp;</div>` +
                    `       <div><span><</span><span style="color: #FC8E10;">${item.formEmailAddress}</span><span>></span></div>` +
                    `   </div>` +
                    `</div>` +
                    `<div class="row msg_container base_sent m-b-30" style="padding:0">` +
                    `   <div class="col-md-12 col-xs-12">` +
                    `       <div class="text-left">` +
                    // `           <span datetime="2009-11-13T20:00">${item.name} • ${moment(item.createAt).format('DD/MM/YYYY HH:ss')}</span>` +
                    item.content +
                    `       </div>` +
                    `       <div class="">` +
                    // item.textContent+
                    // `           <p class="messages msg_sent">${item.content}</p>` +
                    `       </div>` +
                    `   </div>` +
                    `</div>`
            }

            if (Number(item.activitySubType) == 6) {//agent
                listMessage +=
                    `<div class="row msg_container base_sent " style="padding:0">` +
                    `   <div class="col-md-12 col-xs-12 flex-start">` +
                    `       <div>[${moment(item.whenCreated).format('HH:mm - DD/MM/YYYY')}]&nbsp;&nbsp;</div>` +
                    `       <div><span><</span><span style="color: #1195A4;">${item.formEmailAddress}</span><span>></span></div>` +
                    `   </div>` +
                    `</div>` +
                    `<div class="row msg_container base_sent m-b-30" style="padding:0">` +
                    `   <div class="col-md-12 col-xs-12">` +
                    `       <div class="text-left">` +
                    // `           <span datetime="2009-11-13T20:00">${item.name} • ${moment(item.createAt).format('DD/MM/YYYY HH:ss')}</span>` +
                    item.content +
                    `       </div>` +
                    `       <div class="">` +
                    // `           <p class="messages msg_receive">${item.content}</p>` +
                    // item.textContent+
                    `       </div>` +
                    `   </div>` +
                    `</div>`
            }
        })

        return listMessage;
    }
    var showNote = function (data) {
        if (!data.note) return ``
        return data.note;
    }

    var showInfoConver = function (data) {
        if (!data) return ``;
        return `` +
            `<div class="col-md-8 p-0 right-side" style="width:262px">` +
            `   <div class="m-8">${_.has(data, 'nameChannel') && data.nameChannel ? data.nameChannel : '-- '}</div>` +
            `   <div class="m-8">${_.has(data, 'website') && data.website ? data.website : '-- '}</div>` +
            `   <div class="m-8">${_.has(data, 'ip') && data.ip ? data.ip : ' --'}</div>` +
            `   <div class="m-8">${_.has(data, 'countMessage') && data.countMessage ? data.countMessage : 0}</div>` +
            `</div>`
    }


    return {
        init: function () {
            $('.container').attr('class', 'container-fluid')
            // bindValueChat();
            bindClickChat();
            getFilterChat(false);
            window.onbeforeunload = null;
            $('.multi-date-picker').datepicker({
                multidate: 2,
                multidateSeparator: ' - ',
                format: 'dd/mm/yyyy'
            });
            bindThValue();
            bindTextValue();
            console.log(2222, indexTable);
            $('.selectpicker').selectpicker('refresh');
        },
        uncut: function () {
            $(document).off('click', '#btnExport');
            $(document).off('click', '.btn-show');
            $(document).off('click', '#pagingChat .pagination li a')
        }
    };
}(jQuery);