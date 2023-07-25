
var DFT = function ($) {
    var lastSearch = {},
        pagingObject = {},
        lastPagingData = {},
        ticketStatus = {
            NOT_PROCESS: 'Chờ xử lý',
            PROCESSING: 'Đang xử lý',
            COMPLETE: 'Hoàn thành'
        };

    function bindSocket(client) {
        // Nhận dữ liệu phân trang từ server
        console.log('client', client)
        client.on('responseReportCallMonitorPagingData', function (resp) {
            console.log('resp', resp)
            var index = _.indexOf(pagingObject[resp.formId], Number(resp.dt));
            if (_.has(pagingObject, resp.formId) && index >= 0) {
                pagingObject[resp.formId] = _.reject(pagingObject[resp.formId], function (el, i) {
                    return i <= index;
                });

                if (resp.code == 200) {
                    // lastPagingData[resp.formId] = resp.message;
                    $('#' + resp.formId + ' #ticket-paging').html(createPaging(resp.message));
                    $('#ticket-total').html('<b>' +
                        '<span class="TXT_TOTAL"></span>: ' +
                        '<span class="bold c-red" id="ticket-total">' + resp.message.totalResult + '</span>' +
                        '</b>');
                    $('.TXT_TOTAL').html(_config.MESSAGE.REPORT_CALL_MONITOR.TXT_TOTAL);
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
        _.each(_.allKeys(_config.MESSAGE.REPORT_CALL_MONITOR), function (item) {
            var obj = $('.' + item);
            if (obj.prop('tagName')) {
                obj.html(_config.MESSAGE.REPORT_CALL_MONITOR[item]);

                var index = obj.closest('th').index();
                temp[index] = '<li class="p-l-15 p-r-20"> ' +
                    '<div class="checkbox">' +
                    '<label> ' +
                    '<input type="checkbox" class="select-box column-display" data-index="' + index + '" checked>' +
                    '<i class="input-helper"></i>' +
                    '<a class="p-l-5 text-capitalize text-nowrap">' + _config.MESSAGE.REPORT_CALL_MONITOR[item] + '</a>' +
                    '</label>' +
                    '</div>' +
                    '</li>';
            }
        });

        $('#showHideFields').append(temp.join(''));
    };

    function bindClick() {
        // Load lại page
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

        // Lọc dữ liệu báo cáo
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

        // Thay đổi cột hiển thị báo cáo
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

        // Download file báo cáo
        $(document).on('click', '#download-excel', function () {
            queryFilter('frm-report-call-monitor', true, true, lastPagingData['frm-report-call-monitor'].totalResult);
        });

        // Nghe file ghi âm
        $(document).on('click', '.playAudio', function () {
            var $this = $(this);
            var audio = $this.closest('td').find('audio')[0];

            audio.onended = function () {
                $(this).closest('td').find('.zmdi-play').show();
                $(this).closest('td').find('.zmdi-pause').hide();
            };

            _.each($('audio'), function (el) {
                var __audio = $(el)[0];
                if (__audio != audio && !__audio.paused) {
                    __audio.pause();
                    $(el).closest('td').find('.zmdi-play').show();
                    $(el).closest('td').find('.zmdi-pause').hide();
                }
            });

            if (audio.paused) {
                audio.play();
                $this.find('.zmdi-play').hide();
                $this.find('.zmdi-pause').show();
            } else {
                audio.pause();
                $this.find('.zmdi-play').show();
                $this.find('.zmdi-pause').hide();
            }
        });
    };

    // Lấy dữ liệu lọc báo cáo và truy vấn server
    function queryFilter(formId, ignoreSearch, downloadExcel, totalResult) {
        var filter = _.chain($('#' + formId + ' .searchColumn'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '')) {
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
        console.log(193, url);
        if (downloadExcel) {
            // alert(url)
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
                // console.log(resp.message);
                // alert('stop');
                downloadFromUrl(window.location.origin + resp.message);
            }
        });
    };

    // Truy vấn dữ liệu ticket
    function requestTickets(formId, dateTime, url, ignoreSearch) {
        if (!_.has(pagingObject, formId)) pagingObject[formId] = [];
        pagingObject[formId].push(dateTime);
        createLoadingPaging(formId);
        // console.log('vao day nhe');
        _AjaxData(url, 'GET', null, function (resp) {
            console.log('vao day nhe', resp);
            if (resp.code == 500 || (resp.message.length == 0 && !ignoreSearch)) {
                $('#' + formId + ' #ticket-paging').html('');
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
                $('#' + formId + ' #ticket-paging').html(createPaging(resp.paging));
                lastPagingData[formId] = resp.paging;
                console.log(resp.paging);

                let { totalResult } = resp.paging;

                $('#ticket-total').html('<b>' +
                '<span class="TXT_TOTAL"></span>: ' +
                '<span class="bold c-red" id="ticket-total">' + totalResult + '</span>' +
                '</b>');
                $('.TXT_TOTAL').html(_config.MESSAGE.REPORT_CALL_MONITOR.TXT_TOTAL);

            }
        });
    };

    // Cập nhật lại các tiêu chí tìm kiếm lên màn hình
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
        if (!_.has(lastPagingData, formId) || _.isEmpty(lastPagingData[formId])) return '';
        $('#' + formId + ' #ticket-paging').html(createPaging(lastPagingData[formId]));
    };

    // Hiển thị phân trang lên giao diện
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

    // Hiển thị màn hình chờ khi truy vấn
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

    // Hiển thị dữ liệu lên màn hình
    function loadData(formId, resp) {
        var template = '<tr>' +
            '<td>{0}</td>' +
            '<td>{1}</td>' +
            '<td>{2}</td>' +
            '<td>{3}</td>' +
            '<td>{4}</td>' +
            '<td>{5}</td>' +
            '<td>{6}</td>' +
            '<td>{7}</td>' +
            '<td class="text-center">{8}</td>' +
            '</tr>';

        var rows = '';
        resp.message.forEach(function (el) {
            if (_.isEmpty(el)) return;
            console.log(el);
            var buttonAction = `<audio id="${el._id}" class="myAudio" preload="none">` +
                `<source  src="${ipRecording}/${el.fileName}" type="audio/wav">` +
                //'<source src="'+ el.recordingPath +'" type="audio/ogg; codecs=vorbis">' +
                'Your user agent does not support the HTML5 Audio element.' +
                '</audio>' +
                `<button class="btn btn-default playAudio" type="button">` +
                '<i class="zmdi zmdi-play f-25" ></i>' +
                '<i class="zmdi zmdi-pause f-25" style="display: none;"></i>' +
                '</button>' +
                `<button class="btn btn-default m-l-10" type="button">` +
                `<a href="${ipRecording}/` + el.fileName + '?download=true" download><i class="zmdi zmdi-download zmdi-hc-fw download-audio f-25" data-url="' + el.callId + '"></i></a>' +
                '</button>';

            if(el.fileStatus == 'NOT_EXIST') buttonAction = 'Không tồn tại ghi âm';
            if(el.fileStatus == 'PROCESSING') buttonAction = 'Đang tải ghi âm';
            if(!el.fileName) buttonAction = '';

            rows += template.str(el.direction,
                el.agent,
                el.extension,
                el.customer ? el.customer : '',
                moment(el.connectTime, "HH:mm:ss DD/MM/YYYY").format("DD/MM/YYYY"),
                el.connectTime,
                el.disconnectTime,
                moment().startOf('day').seconds(Math.ceil(el.duration)).format('HH:mm:ss'),
                buttonAction
            );

            setValueLastSearch();

            $('#' + formId + ' #ticket-body').html(rows);
            // setTimeout(() => {
            //     document.getElementById(res.data.sessionId).load();
            // }, 100);
            $('.selectpicker').selectpicker('refresh');
            $('.tag-select').trigger("chosen:updated");

            window.MainContent.loadTooltip();
        });
    };

    function updateView() {
        // resize chosen picker
        $(".chosen-container").each(function () {
            $(this).attr('style', 'width: 100%');
        });

        // Setup date range picker
        $('.daterangepicker').daterangepicker({
            autoUpdateInput: false,
            opens: "center",
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

            window.onbeforeunload = null;

            bindTextValue();
            updateView();
            bindSocket(_socket);
            setValueLastSearch();
            bindClick();

            $('.multi-date-picker').datepicker({
                multidate: 2,
                multidateSeparator: ' - ',
                format: 'dd/mm/yyyy'
            });
            //queryFilter('frm-report-call-monitor', true);
        },
        uncut: function () {
            // Disable sự kiện khi đóng trang
            lastSearch = {};
            pagingObject = {};
            lastPagingData = {};
            $(document).off('click', '.sort');
            $(document).off('click', '#btn-search');
            $(document).off('click', '.zpaging');
            $(document).off('keyup', '.filter');
            $(document).off('change', '.column-display');
            $(document).off('click', '#download-excel');
            $(document).off('click', '.playAudio');
            $(document).off('click', '.download-audio');
            $(document).off('click', '.zmdi-refresh');
            delete _socket.off('responseReportCallMonitorPagingData');
        }
    };
}(jQuery);