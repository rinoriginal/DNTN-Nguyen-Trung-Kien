var DFT = function ($) {
    var lastSearch = {},
        pagingObject = {},
        lastPagingData = {};

    function bindSocket(client) {
        // lấy dữ liệu phân trang từ server
        client.on('responseReportRequestRecallPagingData', function (resp) {
            var index = _.indexOf(pagingObject[resp.formId], Number(resp.dt));
            if (_.has(pagingObject, resp.formId) && index >= 0) {
                $('.card .z-panel').removeClass('show-loading');
                pagingObject[resp.formId] = _.reject(pagingObject[resp.formId], function (el, i) {
                    return i <= index;
                });

                if (resp.code == 200) {
                    lastPagingData[resp.formId] = resp.message;
                    $('#' + resp.formId + ' #ticket-paging').html(createPaging(resp.message));
                    $('#ticket-total').html('<b>' +
                        '<span class="TXT_TOTAL"></span>: ' +
                        '<span class="bold c-red" id="ticket-total">' + resp.message.totalResult + '</span>' +
                        '</b>');
                    $('.TXT_TOTAL').html(_config.MESSAGE.REPORT_INBOUND_TICKETS.TXT_TOTAL);
                    $('#download-excel').show();
                } else {
                    $('#' + resp.formId + ' #ticket-paging').html('');
                    $('#ticket-total').html('');
                    $('#download-excel').hide();
                }
            }
        });
    };

    // Hiển thị tên cột theo file config
    function bindTextValue() {
        var temp = [];
        _.each(_.allKeys(_config.MESSAGE.REPORT_REQUEST_RECALL), function (item) {
            var obj = $('.' + item);
            obj.html(_config.MESSAGE.REPORT_REQUEST_RECALL[item]);

            if (obj.prop('tagName') && obj.parents('#frm-report-request-recall').length) {
                var index = obj.closest('th').index();
                temp[index] = '<li class="p-l-15 p-r-20"> ' +
                    '<div class="checkbox">' +
                    '<label> ' +
                    '<input type="checkbox" class="select-box column-display" data-index="' + index + '" checked>' +
                    '<i class="input-helper"></i>' +
                    '<a class="p-l-5 text-capitalize text-nowrap">' + _config.MESSAGE.REPORT_REQUEST_RECALL[item] + '</a>' +
                    '</label>' +
                    '</div>' +
                    '</li>';
            }
        });

        $('#showHideFields').append(temp.join(''));
    };

    function bindClick() {
        // Làm mới trang
        $(document).on('click', '.zmdi-refresh', function () {
            _.LoadPage(window.location.hash);
        });
        // Click tìm kiếm
        $(document).on('click', '#btn-search', function () {
            var formId = $(this).closest('form').attr('id');
            queryFilter(formId);
        });
        // Chuyển trang
        $(document).on('click', '.zpaging', function () {
            var formId = $(this).closest('form').attr('id');
            window.location.obj['page'] = $(this).attr('data-link');
            queryFilter(formId);
        });
        // Nhấn phím enter
        $(document).on('keyup', '.filter', function (e) {
            if (e.keyCode == 13) {
                var formId = $(this).closest('form').attr('id');
                queryFilter(formId);
            }
        });
        // xuất file báo cáo
        $(document).on('click', '#download-excel', function () {
            queryFilter('report-request-recall',
                true,
                true,
                lastPagingData['report-request-recall'].totalResult
            );
        });
        //Gọi ra nhanh theo chiến dịch
        $(document).on('click', '#btnQuickCallReport', function () {
            let phone = $(this).attr('data-phone')
            phone && phone != "" ? $("#txtUserMobile").val(phone) : ""
            if (getCookie('_agentState') == "READY") {
                return swal({
                    title: "Thông báo",
                    text: "Bạn cần chuyển trạng thái không sẵn sàng để thực hiện cuộc gọi!",
                    type: "warning",
                    confirmButtonColor: "#DD6B55",
                    confirmButtonText: "OK",
                    closeOnConfirm: true,
                });
            }

            $('#txtUserMobile').autocomplete({
                source: [
                    {
                        url: "/customer/search?type=getCustomerByKeyword&keyword=%QUERY%",
                        type: 'remote',
                    }
                ],
                preparse: function (items) {
                    if (items.message) {
                        return items.message.map(function (item, i) {
                            return {
                                value: item.phone,
                                title: (item.name ? item.name : ' ') + ' (' + item.phone + ' )'
                            };
                        });
                    } else {
                        return items;
                    }
                },
                filter: function (items, query, source) {
                    var results = [], value = '';

                    for (var i in items) {
                        value = items[i][this.valueKey];
                        results.push(items[i]);
                    }
                    return results;
                },
                dropdownWidth: '180%'
            });

            $('#sltCampains').empty();
            var defaultCampainsId = localStorage.getItem('campainsId');

            _AjaxData('/ticket-import-by-phone/search', 'GET', 'campains', function (resp) {
                console.log(resp)
                if (resp.data.length > 0) {

                    _.each(resp.data, function (campain, idx) {
                        var sltDefault = '';

                        if (defaultCampainsId && campain._id == defaultCampainsId) {
                            sltDefault = 'selected';
                        }
                        $('#sltCampains').append('<option style="padding:5px" value="' + campain._id + '" ' + sltDefault + '>' + campain.name + '</option>');
                    })
                }
            })
            $('#quickCallGGG').modal({
                backdrop: 'static',
                keyboard: false
            });
        });
        var intervalCisco = null;
        $(document).on('click', '#quickCallSubmit', function (e) {
            e.preventDefault();
            let phone = $('#txtUserMobile').val()
            let idCampain = $('#sltCampains').val()
            //Lưu vào Localstorage
            localStorage.setItem('campainsId', $('#sltCampains').val());
            // 1. make cuộc call
            // 2. get thông tin cuộc call và tạo ticket
            $.LoadingOverlay("show", {
                text: "Đang thực hiện call ra."
            });
            window._finesse.makeCall(phone, getCookie('_extension'), function (_1, _2, xhr) {
                console.log('Data make call:', xhr)
                if (xhr && xhr.status === 202) {
                    let finished = false
                    let countCallApi = 0
                    let dialog = ""
                    async.until(function (params) {
                        return finished == true
                    }, function iter(next) {
                        window._finesse.getDialogs(getCookie('_agentId'), function (_11, _22, data) {
                            countCallApi++
                            let response = JSON.parse(xml2json(data.responseText));
                            if (response && response.Dialogs && response.Dialogs.Dialog) {
                                console.log("Response", response.Dialogs.Dialog)
                                finished = true
                                dialog = response.Dialogs.Dialog;
                                next()
                            } else {
                                finished = false
                                next()
                            }
                        });
                    }, function done(err) {
                        $.LoadingOverlay("text", "Cuộc call đã được kết nối.");
                        // Khi có cuộc call kết nối thực hiện call api tạo ticket
                        let data = {
                            fromAddress: getCookie('_extension'),
                            idCampain: idCampain,
                            phone: phone,
                            id: dialog && dialog.id
                        }
                        jQuery.post('/api/v1/voice/click-two-call', data
                            , function (resp) {
                                $('#quickCallGGG').modal('hide');
                                if (resp && resp.code == 200) {
                                    $.LoadingOverlay("hide");
                                    window.location.hash = 'ticket-edit?ticketID=' + resp.ticketId;
                                } else {
                                    $.LoadingOverlay("hide");
                                    return swal({
                                        title: "Thông báo",
                                        text: "Tạo thông tin khách hàng và ticket thất bại!",
                                        type: "warning",
                                        confirmButtonColor: "#DD6B55",
                                        confirmButtonText: "OK",
                                        closeOnConfirm: true,
                                    });
                                }

                            });
                    })
                }
            }, _makeCallHandler);
        });
    }

    // Lấy dữ liệu lọc và truy vấn server
    function queryFilter(formId, ignoreSearch, downloadExcel, totalResult) {
        var filter = _.chain($('#' + formId + ' .searchColumn'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) {
                    memo[el.name] = $(el).val();
                    if (el.name == 'agentId') {
                        // console.log( $(el).find('option:selected').map((i, item) => $(item).attr("data-id")) );
                        memo['idAgentCisco'] = $(el).find('option:selected').map((i, item) => $(item).attr("data-id")).get().filter(i => i !== '');
                    }
                }
                return memo;
            }, {}).value();
        var sort = _.chain($('#' + formId + ' thead tr th').not('[data-sort="none"]'))
            .map(function (el) {
                return $(el).attr('sortName') ? $(el).attr('sortName') + ':' + $(el).attr('data-sort') : '';
            })
            .compact()
            .value();
        sort = _.isEmpty(sort) || _.isEqual(sort.length, 0) ? '' : '&sort=' + sort[0];
        var paging = _.has(window.location.obj, 'page') ? '&page=' + window.location.obj.page : '';

        var dateTime = (new Date()).getTime();
        var custom = '&socketId=' + _socket.id
            + '&formId=' + formId
            + '&dt=' + dateTime
            + '&ignoreSearch='
            + (ignoreSearch ? 1 : 0)
            + '&download=' + (downloadExcel ? 1 : 0)
            + '&totalResult=' + (totalResult ? totalResult : 0);
        var url = (newUrl(window.location.hash, filter) + sort + paging + custom).replace('#', '');
        if (downloadExcel) {
            downloadExcelReport(url);
        } else {
            requestTickets(formId, dateTime, url, ignoreSearch);
        }
    };
    // Tải file báo cáo
    function downloadExcelReport(url) {
        $('.page-loader').show();
        $.get(url, function (resp) {
            $('.page-loader').hide();
            if (resp.code == 500) {
                swal({
                    title: 'Đã có lỗi xảy ra',
                    text: resp.message,
                    type: "error"
                });
            } else {
                downloadFromUrl(window.location.origin + resp.message);
            }
        });
    }

    // Truy vấn dữ liệu ticket
    function requestTickets(formId, dateTime, url, ignoreSearch) {
        if (!_.has(pagingObject, formId)) pagingObject[formId] = [];
        pagingObject[formId].push(dateTime);
        createLoadingPaging(formId);
        $('.card .z-panel').addClass('show-loading');
        _AjaxData(url, 'GET', null, function (resp) {
            console.log("11111", resp);
            if (resp.code == 500 || (resp.message.length == 0 && !ignoreSearch)) {
                $("#ticket-body").html("");
                swal({
                    title: 'Không tìm thấy kết quả với khoá tìm kiếm',
                    text: resp.message,
                    type: "warning",
                    confirmButtonColor: "#DD6B55",
                    confirmButtonText: "Xác nhận!",
                    closeOnConfirm: true
                }, function () {
                    reverseSearchValue();
                    reversePagingData(formId);
                });
            } else {
                loadData(formId, resp);
            }
        });
    };

    // Hiển thị dữ liệu đã lọc
    function setValueLastSearch() {
        _.each($(' .searchColumn'), function (el) {
            var name = $(el).attr('name');
            var value = $(el).val();
            lastSearch[name] = value;
        });
    };

    function reverseSearchValue() {
        _.each($('.searchColumn'), function (el) {
            var name = $(el).attr('name');
            var value = lastSearch[name] ? lastSearch[name] : '';
            $(el).val(value);
        });

        $('.selectpicker').selectpicker('refresh');
        $('.tag-select').trigger("chosen:updated");
    };

    function reversePagingData(formId) {
        if (!_.has(lastPagingData, formId) || _.isEmpty(lastPagingData[formId])) {
            $('#' + formId + ' #ticket-paging').html('');
            return '';
        }
        $('#' + formId + ' #ticket-paging').html(createPaging(lastPagingData[formId]));
    };

    // Hiển thị dữ liệu phân trang
    function createPaging(paging) {
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

    function createLoadingPaging(formId) {
        var htmlCode = '<div class="paginate text-center">' +
            '<ul class="pagination">' +
            '<li>' +
            '<img src="assets/images/loading.gif"/>' +
            '</div> ' +
            '</li>' +
            '</ul></div>';
        $('#' + formId + ' #ticket-paging').html(htmlCode);
    };

    // Hiển thị dữ liệu báo cáo
    function loadData(formId, resp) {
        var template = '<tr>' +
            '<td class="text-center">{0}</td>' +
            '<td class="text-center">{1}</td>' +
            '<td class="text-center">{2}</td>' +
            '<td class="text-center">{3}</td>' +
            '<td class="text-center">{4}</td>' +
            '<td class="text-center">{5}</td>' +
            '</tr>';

        var rows = '';
        resp.message.forEach(function (el, index) {
            index = ((resp.page - 1) * 10) + (index + 1)
            rows +=
                template.str(index,
                    el.ANI,
                    moment(el.startTime).subtract(7, 'hours').format("HH:mm:ss DD/MM/YYYY"), //giờ từ ciso trả về là chuẩn rồi lên khi dùng moment thì trừ đi 7h
                    moment(el.DateTime).subtract(7, 'hours').format("HH:mm:ss DD/MM/YYYY"),
                    genStatus(el.DIRECTION),
                    genButtonCall(el.DIRECTION, el.ANI)
                );
        });

        setValueLastSearch();
        $('#' + formId + ' #ticket-body').html(rows);
        $('.selectpicker').selectpicker('refresh');
        $('.tag-select').trigger("chosen:updated");
        window.MainContent.loadTooltip();
    };
    function genStatus(el) {
        let string = "";
        if (el == 0) {
            string += "Đã gọi lại"
        } else {
            string += "Yêu cầu gọi lại"
        }
        return string;
    }
    function genButtonCall(el, phone) {
        let string = "";
        if (el == 1) {
            string = '<i id="btnQuickCallReport" class="zmdi zmdi-phone-in-talk c-green f-17" data-phone="' + phone + '"></i>';
        } else {
            string = "";
        }
        return string;
    }

    return {
        init: function () {
            bindTextValue();
            bindSocket(_socket);
            setValueLastSearch();
            bindClick();
        },
        uncut: function () {
            // disable sự kiện khi đóng trang
            lastSearch = {};
            pagingObject = {};
            lastPagingData = {};
            $(document).off('click', '.sort');
            $(document).off('click', '#btn-search');
            $(document).off('click', '#btnQuickCallReport');
            $(document).off('click', '.zpaging');
            $(document).off('keyup', '.filter');
            $(document).off('change', '.column-display');
            $(document).off('click', '#download-excel');
            $(document).off('click', '.zmdi-refresh');
            //delete _socket.$events['responseReportRequestRecallPagingData'];
        }
    };
}(jQuery);