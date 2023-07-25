var DFT = function ($) {
    /**
    * Hiển thị tên trường/cột theo file config
    */
    var indexTable = [];
    var bindValueChat = function () {
        _.each(_.allKeys(_config.MESSAGE.REPORT_STATISTIC_CHAT), function (item, i) {
            if (i < _.allKeys(_config.MESSAGE.REPORT_STATISTIC_CHAT).length - 1) {
                indexTable.push(i)
            }

        });
    };
    // Hiển thị tên cột theo file config
    function bindTextValue() {
        let temp = [];
        _.each(_.allKeys(_config.MESSAGE.REPORT_STATISTIC_CHAT), function (item) {
            let obj = $('.' + item);
            if (obj.prop('tagName')) {
                obj.html(_config.MESSAGE.REPORT_STATISTIC_CHAT[item]);

                let index = obj.closest('th').index();
                temp[index] = '<li class="p-l-15 p-r-20 b-b"> ' +
                    // '<input type="checkbox" id="" class="list-trieu-chung" />' +
                    '<div class="checkbox m-0 p-t-3 p-b-10">' +
                    '<label class="dp-block"> ' +
                    '<input type="checkbox" class="select-box column-display bgm-white text-right" data-index="' + index + '" checked>' +
                    '<i class="input-helper c-white"></i>' +
                    '<a class="p-l-5 text-capitalize text-nowrap c-white text-right dp-block">' + _config.MESSAGE.REPORT_STATISTIC_CHAT[item] + '</a>' +
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
        _.each(_.allKeys(_config.MESSAGE.REPORT_STATISTIC_CHAT), function (item, i) {
            temp += '<th class="bgm-confix-header c-white text-center"><span class=' + item + '>' + _config.MESSAGE.REPORT_STATISTIC_CHAT[item] + '</span></th> '
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
            let _num = _.allKeys(_config.MESSAGE.REPORT_STATISTIC_CHAT).length - indexTable.length
            if (_num < 10) {
                $('#exceldata').attr('class', 'table table-hover table-condensed table-bordered table-fix table-striped')
            } else {
                $('#exceldata').attr('class', 'table table-hover table-condensed table-bordered table-fix table-striped exceldata')
            }
        });


        // query lấy dữ liệu lịch sử chat
        $(document).on('click', '.btn-show', function (e) {
            let filter = {}
            filter.scope = 'search-history-chat'
            filter.idChat = $(this).attr('data-id')
            _Ajax("/report-statistic-chat?" + $.param(filter), 'GET', {}, function (resp) {
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
            _Ajax("/report-statistical-conversation-by-month?" + $.param(filter), 'GET', {}, function (resp) {
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



    // Lấy dữ liệu lọc và truy vấn server
    var getFilterChat = function (load, exportExcel, page) {
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
            _Ajax("/report-statistic-chat?" + $.param(filter), 'GET', {}, function (resp) {
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
                        hideColumn(indexTable);
                        $('#pagingChat').append(_.paging('#report-statistic-chat', resp.paging));
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
                        });
                    }
                } else {
                    console.log(22222222, resp);
                    swal({ title: 'Cảnh báo!', text: resp.message });
                }
            })
        } else {
            _Ajax("/report-statistic-chat?" + $.param(filter), 'GET', {}, function (resp) {
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
                        hideColumn(indexTable);
                        $('#pagingChat').append(_.paging('#report-statistic-chat', resp.paging));
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
        let convertTypeChat = function (n) {
            switch (Number(n)) {
                case 0:
                    return '';
                case 1:
                    return 'Tiếp nhận';
                case 2:
                    return 'Nhỡ';
                case 3:
                    return 'Offline';
            }
        }
        let convertStatus = function (n) {
            switch (Number(n)) {
                case 0:
                    return 'Chờ xử lý';
                case 1:
                    return 'Đang xử lý';
                case 2:
                    return 'Hoàn thành';
                default:
                    return '';
            }
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
                '<td class="text-center">{12}</td>' +
                '<td class="text-center">{13}</td>' +
                '<td class="text-center">{14}</td>' +
                '<td class="text-center">{15}</td>'

            let _td = '';
            _td += template.str(
                el.createDate ? moment(el.createDate).format('HH:mm:ss DD/MM/YYYY') : '',
                el.customerName ? el.customerName : '',
                el.customerPhone ? el.customerPhone : '',
                el.customerEmail ? el.customerEmail : '',
                el.channelName ? el.channelName : '',
                el.typeChat ? convertTypeChat(el.typeChat) : '',
                el.reasonCategory ? el.reasonCategory : '',
                el.reason ? el.reason : '',
                el.status != null ? convertStatus(el.status) : '',
                el.chatWaitTime ? msToTime(el.chatWaitTime) : '00:00:00',
                el.msgTime ? msToTime(el.msgTime) : '00:00:00',
                el.chatTime ? msToTime(el.chatTime) : '00:00:00',
                el.sumMsg ? el.sumMsg : '',
                el.whenModified ? moment(el.whenModified).format('HH:mm:ss DD/MM/YYYY') : '',
                el.nameAgent ? el.nameAgent : '',
                el.note ? el.note : '',
                // (el.chatReceive) == 0 ? '00:00:00' : msToTime(el.chatTime / (el.chatReceive)),
            );
            return _td;
        }

        var rows = '';
        resp.data.forEach(function (el) {
            if (_.isEmpty(el)) return;
            rows +=
                '<tr id="showTd">' +
                renderRow(el) +
                '<td class="text-center"><a role="button" data-id="' + (el ? el._id : '') + '" data-form="complaint" href="javascript:void(0)" class="p-t-3 btn-flat-bg btn-show" data-toggle="tooltip" data-placement="top" data-original-title="Thông tin hội thoại"><i style="color:#3F8498" class="zmdi zmdi-comments  f-17"></i></a> </td>' +
                '</tr>';
        });

        $('#body-table').html(rows);
        window.MainContent.loadTooltip();
    };


    // hiển thị lịch sử chat
    var loadHistory = function (resp) {

        $('#pills-tabContent').empty()

        let templateBoxChat =
            `<div role="tabpanel" class="tab-pane active" id="tab-list-chat">` +
            `   <div class="panel-body msg_container_base">` +
            showMessage(resp.data[0]) +
            `   </div>` +
            `</div>`
        let templateInfo =
            `<div role="tabpanel" class="tab-pane " id="tab-info-chat">` +
            `   <div class="panel-body p-0">` +
            `       <div class="title">` +
            `           <span class="m-4 m-l-16" style="font-size: 11px;">Thông tin hội thoại</span>` +
            `       </div>` +
            `       <div class="col-md-12 p-0">` +
            `           <div class="col-md-12 p-0 m-b-5 box-shadow">` +
            `               <div class="col-md-4 p-0 left-side" style="width:123px">` +
            `                   <div class="m-8">Kênh chat :</div>` +
            `                   <div class="m-8">Website :</div>` +
            `                   <div class="m-8">IP :</div>` +
            `                   <div class="m-8">Tổng số tin nhắn :</div>` +
            `               </div>` +
            showInfoConver(resp.data[0]) +
            `           </div>` +
            `       </div>` +
            `       <div class="title">` +
            `           <span class="m-4 m-l-16" style="font-size: 11px;">Thông tin khách hàng</span>` +
            `       </div>` +
            `       <div class="col-md-12 p-0" style="max-height: 413px;overflow-y: scroll;overflow-x: hidden;">` +
            `           <table class=" table table-borderless col-md-12 p-0 m-b-5 box-shadow">` +
            resp.str +
            `           </table>` +
            `       </div>` +
            `   </div>` +
            `</div>`

        let templateNote =
            `<div role="tabpanel" class="tab-pane " id="tab-detail-chat">` +
            `   <div class="panel-body p-0">` +
            `       <div class="title">` +
            `           <span class="m-4 m-l-16" style="font-size: 11px;">Nội dung ghi chú</span>` +
            `       </div>` +
            `       <div class="col-md-12" style="max-height: 546px;overflow-y: scroll;overflow-x: hidden;">` +
            `           <div class="m-t-15 m-b-15">` +
            showNote(resp.data[0]) +
            `           </div>` +
            `       </div>` +
            `   </div>` +
            `</div>`

        $('#pills-tabContent').append(templateBoxChat)
        $('#pills-tabContent').append(templateInfo)
        $('#pills-tabContent').append(templateNote)
    }

    // hiển thị tin nhắn lịch sử chat
    var showMessage = function (data) {
        let listMessage = '';
        if (!data.messagesChat) return ``

        data.messagesChat.forEach(function (item) {
            if (item.type == 'agent') {
                listMessage +=
                    `<div class="row msg_container base_sent" style="padding:0">` +
                    `   <div class="col-md-12 col-xs-12">` +
                    `       <div class="text-right m-b-3">` +
                    `           <span datetime="2009-11-13T20:00">${item.name} • ${moment(item.createAt).format('HH:mm:ss DD/MM/YYYY')}</span>` +
                    `       </div>` +
                    `       <div class="flex-end">` +
                    `           <p class="messages msg_sent">${item.content}</p>` +
                    `       </div>` +
                    `   </div>` +
                    `</div>`
            }

            if (item.type == 'customer') {
                listMessage +=
                    `<div class="row msg_container base_receive" style="padding:0">` +
                    `   <div class="col-md-12 col-xs-12">` +
                    `       <div class="text-left m-b-3">` +
                    `           <span datetime="2009-11-13T20:00">${item.name} • ${moment(item.createAt).format('HH:mm:ss DD/MM/YYYY')}</span>` +
                    `       </div>` +
                    `       <div class="">` +
                    `           <p class="messages msg_receive">${item.content}</p>` +
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