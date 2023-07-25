
var DFT = function ($) {
    var lastSearch = {},
        pagingObject = {},
        lastPagingData = {},
        ticketStatus = {
            NOT_PROCESS: 'Chờ xử lý',
            PROCESSING: 'Đang xử lý',
            COMPLETE: 'Hoàn thành'
        };
    // Cập nhật lại danh sách agent khi thay đổi công ty
    var cascadeOption = function () {
        $('select[name="company"]').on('change', function () {
            var query = {};
            if ($(this).val() !== "") query.idParent = $(this).val();
            $.get('/report-inbound-overall-agent-productivity', query, function (res) {
                $('select[name="updateBy"]').empty();
                $('select[name="updateBy"]').append(_.Tags([{
                    tag: 'option',
                    attr: { value: "", selected: true },
                    content: "- Chọn -"
                }]));
                _.each(res, function (o) {
                    $('select[name="updateBy"]').append(_.Tags([{
                        tag: 'option',
                        attr: { value: o._id },
                        content: o.displayName + "(" + o.name + ")"
                    }]));
                });
                $('select[name="updateBy"]').trigger("chosen:updated");
            });
        });
    };

    function bindSocket(client) {
        // Nhận dữ liệu phân trang từ server
        client.on('responseReportInboundTicketPagingData', function (resp) {
            var index = _.indexOf(pagingObject[resp.formId], Number(resp.dt));
            if (_.has(pagingObject, resp.formId) && index >= 0) {
                pagingObject[resp.formId] = _.reject(pagingObject[resp.formId], function (el, i) {
                    return i <= index;
                });

                if (resp.code == 200) {
                    lastPagingData[resp.formId] = resp.message;
                    $('#' + resp.formId + ' #ticket-paging').html(createPaging(resp.message));
                    $('#ticket-total').html('<b>' +
                        '<span class="TXT_TOTAL"></span>: ' +
                        '<span class="bold c-red" id="total-result">' + resp.message.totalResult + '</span>' +
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
        _.each(_.allKeys(_config.MESSAGE.REPORT_INBOUND_TICKETS), function (item) {
            var obj = $('.' + item);
            if (obj.prop('tagName')) {
                obj.html(_config.MESSAGE.REPORT_INBOUND_TICKETS[item]);

                var index = obj.closest('th').index();
                temp[index] = '<li class="p-l-15 p-r-20"> ' +
                    '<div class="checkbox">' +
                    '<label> ' +
                    '<input type="checkbox" class="select-box column-display" data-index="' + index + '" checked>' +
                    '<i class="input-helper"></i>' +
                    '<a class="p-l-5 text-capitalize text-nowrap">' + _config.MESSAGE.REPORT_INBOUND_TICKETS[item] + '</a>' +
                    '</label>' +
                    '</div>' +
                    '</li>';
            }
        });

        $('#showHideFields').append(temp.join(''));
    };

    function bindClick() {
        // Reload lại trang
        $(document).on('click', '.zmdi-refresh', function () {
            _.LoadPage(window.location.hash);
        });

        // Sắp xếp dữ liệu
        $(document).on('click', '.sort', function () {
            var $this = $(this);
            switch ($this.attr('data-sort')) {
                case 'none':
                    $this.toggleAttr('data-sort', 'asc');
                    break;
                case 'asc':
                    $this.toggleAttr('data-sort', 'desc');
                    break;
                case 'desc':
                    $this.toggleAttr('data-sort', 'none');
                    break;
            }
            $this.siblings().toggleAttr('data-sort', 'none');
            var formId = $(this).closest('form').attr('id');
            queryFilter(formId);
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

        // Thay đổi hiển thị các cột trên giao diện
        $(document).on('change', '.column-display', function (e) {
            var dataIndex = $(this).attr('data-index');
            var checked = $(this).is(":checked");

            _.each($('th'), function (el) {
                var index = $(el).index();

                if (index == dataIndex) {
                    if (checked) {
                        $(el).show();
                    } else {
                        $(el).hide();
                    }
                }
            });

            _.each($('td'), function (el) {
                var index = $(el).index();
                if (index == dataIndex) {
                    if (checked) {
                        $(el).show();
                    } else {
                        $(el).hide();
                    }
                }
            })
        });

        // Tải file báo cáo
        $(document).on('click', '#download-excel', function () {
            queryFilter('frm-report-inbound-ticket', true, true, +$('#total-result').text());
        });
        $("#start").on("dp.change", function (e) {
            $('#end').data("DateTimePicker").minDate(e.date);
        });
        $("#end").on("dp.change", function (e) {
            $('#start').data("DateTimePicker").maxDate(e.date);
        });

        /*Controll audio files*/
        $(document).on('click', '.zmdi-play', function () {
            $.each(document.getElementsByClassName('myAudio'), function (i, audio) {
                audio.pause();
            });
            $(this).closest('td').find('audio')['0'].play();
            function onPause(self) {
                $(self).show();
                $(self).next().hide();
            }
            var self = this;
            var audio = $(this).closest('td').find('audio')['0'];
            audio.onpause = function () {
                onPause(self);
            };
            audio.onended = function () {
                onPause(self);
            };
            $(this).next().show();
            $(this).hide();
        });
        $(document).on('click', '.zmdi-pause', function () {
            $(this).closest('td').find('audio')['0'].pause();
            $(this).prev().show();
            $(this).hide();
        });
    };

    // Lấy dữ liệu lọc và truy vấn server
    function queryFilter(formId, ignoreSearch, downloadExcel, totalResult) {
        var filter = _.chain($('#' + formId + ' .searchColumn'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) {
                    memo[el.name] = $(el).val();
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
    };

    // Truy vấn dữ liệu ticket
    function requestTickets(formId, dateTime, url, ignoreSearch) {
        if (!_.has(pagingObject, formId)) pagingObject[formId] = [];
        pagingObject[formId].push(dateTime);
        createLoadingPaging(formId);

        _AjaxData(url, 'GET', null, function (resp) {
            if (resp.code == 500 || (resp.message.length == 0 && !ignoreSearch)) {
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
                $('#' + resp.formId + ' #ticket-paging').html(createPaging(resp.paging));
                $('#ticket-total').html('<b>' +
                    '<span class="TXT_TOTAL"></span>: ' +
                    '<span class="bold c-red" id="ticket-total">' + resp.paging.totalResult + '</span>' +
                    '</b>');
                $('.TXT_TOTAL').html(_config.MESSAGE.REPORT_INBOUND_TICKETS.TXT_TOTAL);
                $('#download-excel').show();
            }
        });
    };

    // Cập nhật lại dữ liệu đã lọc
    function setValueLastSearch() {
        _.each($(' .searchColumn'), function (el) {
            var name = $(el).attr('name');
            var value = $(el).val();
            lastSearch[name] = value;
        });
    };

    function reverseSearchValue() {
        var query = {};
        if (lastSearch['company'] !== "") query.idParent = lastSearch['company'];
        $.get('/report-inbound-overall-agent-productivity', query, function (res) {
            $('select[name="updateBy"]').empty();
            $('select[name="updateBy"]').append(_.Tags([{
                tag: 'option',
                attr: { value: "", selected: true },
                content: "- Chọn -"
            }]));
            _.each(res, function (o) {
                $('select[name="updateBy"]').append(_.Tags([{
                    tag: 'option',
                    attr: { value: o._id },
                    content: o.displayName + "(" + o.name + ")"
                }]));
            });
            $('select[name="updateBy"]').promise().done(function () {
                _.each($('.searchColumn'), function (el) {
                    var name = $(el).attr('name');
                    var value = lastSearch[name] ? lastSearch[name] : '';
                    $(el).val(value);
                });
                $('.selectpicker').selectpicker('refresh');
                $('.tag-select').trigger("chosen:updated");
            })
        });
    };

    function reversePagingData(formId) {
        if (!_.has(lastPagingData, formId) || _.isEmpty(lastPagingData[formId])) {
            $('#' + formId + ' #ticket-paging').html('');
        } else {
            $('#' + formId + ' #ticket-paging').html(createPaging(lastPagingData[formId]));
        }
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

    // Tạo màn hình chờ khi truy vấn
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

    // Hiển thị dữ liệu lên giao diện
    function loadData(formId, resp) {
        var template = '<tr>' +
            '<td title="{0}">{0}</td>' +
            '<td>{1}</td>' +
            '<td title="{2}">{2}</td>' +
            '<td>{3}</td>' +
            '<td title="{4}">{4}</td>' +
            '<td title="{5}">{5}</td>' +
            '<td title="{6}">{6}</td>' +
            '<td title="{7}">{7}</td>' +
            '<td title="{8}">{8}</td>' +
            '<td title="{9}">{9}</td>' +
            '<td title="{10}">{10}</td>' +
            '<td class="text-center">{11}</td>' +
            '</tr>';

        var rows = '';
        resp.message.forEach(function (el) {
            if (_.isEmpty(el)) return;
            var status = '';
            switch (el.status) {
                case 0:
                    status = ticketStatus.NOT_PROCESS;
                    break;
                case 1:
                    status = ticketStatus.PROCESSING;
                    break;
                case 2:
                    status = ticketStatus.COMPLETE;
                    break;
            }

            var updatedBy = el.ubdisplayName === null ? '' : el.ubdisplayName + " (" + el.ubName + ")";
            var buttonAction = '<audio class="myAudio">' +
                '<source src="' + recordPath + el.recordPath + '" type="audio/mp4">' +
                //'<source src="'+ el.recordPath +'" type="audio/ogg; codecs=vorbis">' +
                '</audio>' +
                '<button class="btn btn-default playAudio" type="button">' +
                '<i class="zmdi zmdi-play f-12" ></i>' +
                '<i class="zmdi zmdi-pause f-12" style="display: none;"></i>' +
                '</button>' +
                '<button class="btn btn-default" type="button">' +
                '<a href="' + recordPath + el.recordPath + '" download><i class="zmdi zmdi-download zmdi-hc-fw download-audio f-12" data-url="' + recordPath + el.recordPath + '"></i></a>' +
                '</button>' +
                '<button class="btn btn-default" type="button">' +
                '<a href="/#ticket-edit?ticketID=' + el._id + '"><i class="zmdi zmdi-square-right f-12"></i></a>' +
                '</button>';
            rows += template.str(el.company,
                el.customerIndex ? el.customerIndex.field_so_dien_thoai : '',
                el.sources ? el.sources.join(' ,') : '',
                status,
                el.ticketReasonCategory ? el.ticketReasonCategory : '',
                el.ticketReason ? el.ticketReason : '',
                el.ticketSubreason ? el.ticketSubreason : '',
                el.note,
                moment(el.updated).format('HH:mm DD/MM/YYYY'),
                updatedBy,
                el.callIdLength ? el.callIdLength - 1 : '0',
                el.recordPath ? buttonAction : '<button class="btn btn-default" type="button"><a href="/#ticket-edit?ticketID=' + el._id + '"><i class="zmdi zmdi-square-right f-12"></i></a></button>'
            );
        });

        setValueLastSearch();
        $('#' + formId + ' #ticket-body').html(rows);
        $('.selectpicker').selectpicker('refresh');
        $('.tag-select').trigger("chosen:updated");
        window.MainContent.loadTooltip();
    };

    function updateView() {
        // resize chosen picker
        $(".chosen-container").each(function () {
            $(this).attr('style', 'width: 100%');
        });

        // Setup date range picker
        $('.daterangepicker').daterangepicker({
            autoUpdateInput: false,
            opens: "left",
            locale: {
                format: 'DD/MM/YYYY',
                cancelLabel: 'Clear'
            }
        })
            .on('apply.daterangepicker', function (ev, picker) {
                $(this).val(picker.startDate.format('DD/MM/YYYY') + ' - ' + picker.endDate.format('DD/MM/YYYY'));
            })
            .on('cancel.daterangepicker', function (ev, picker) {
                $(this).val('');
            });
    };

    return {
        init: function () {
            bindSocket(_socket);
            bindTextValue();
            updateView();
            setValueLastSearch();
            bindClick();
            cascadeOption();
            //queryFilter('frm-report-inbound-ticket', true);

            $('.multi-date-picker').datepicker({
                multidate: 2,
                multidateSeparator: ' - ',
                format: 'dd/mm/yyyy'
            });
        },
        uncut: function () {
            // Disable sự kiện khi đóng trang
            lastSearch = {};
            pagingObject = {};
            lastPagingData = {};
            $(document).off('change', 'select[name="idCompany"]');
            $(document).off('change', 'select[name="category"]');
            $(document).off('change', 'select[name="reason"]');
            $(document).off('change', 'select[name="satify"]');
            $(document).off('click', '.sort');
            $(document).off('click', '#btn-search');
            $(document).off('click', '.zpaging');
            $(document).off('keyup', '.filter');
            $(document).off('change', '.column-display');
            $(document).off('click', '#download-excel');
            $(document).off('click', '.zmdi-refresh');
            delete _socket.off('responseReportInboundTicketPagingData');
        }
    };
}(jQuery);