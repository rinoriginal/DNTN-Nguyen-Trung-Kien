var DFT = function ($) {
    /**
    * Hiển thị tên trường/cột theo file config
    */
    var bindValueAdvisory = function () {
        _.each(_.allKeys(_config.MESSAGE.TICKET_ADVISORY), function (item) {
            $('.' + item).html(_config.MESSAGE.TICKET_ADVISORY[item]);
        });
    };

    var bindClickAdvisory = function () {
        // Chuyển trang
        $(document).on('click', '#pagingAdvisory .pagination li a', function (e) {
            e.preventDefault();
            let url = e.target.getAttribute('href')
            let i = url.indexOf("?page=");
            let page = i === -1 ? 1 : url.substring(i + 6);
            _page = page;
            getFilterAdvisoryTicket(false, page);
        });
        // Click tìm kiếm
        $('#searchAdvisoryTicket').click(function () {
            console.log(1111111111);

            getFilterAdvisoryTicket(true);
        });
        // Làm mới trang
        $(document).on('click', '.zmdi-refresh', function () {
            _.LoadPage(window.location.hash);
        });
    };

    // Lấy dữ liệu lọc và truy vấn server
    var getFilterAdvisoryTicket = function (load, page) {
        var filter = _.chain($('.input'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) memo[el.name] = $(el).val();
                return memo;
            }, {}).value();
        console.log('filter', filter);

        if (page) filter['page'] = page;
        if (_idCustomer) filter['idCustomer'] = _idCustomer;
        if (load) {
            _Ajax("/ticket-advisory?search=ticket&" + $.param(filter), 'GET', {}, function (resp) {
                if (resp.code == 200) {
                    $('#body-table').empty();
                    if (resp.data.length) {
                        console.log(resp.data.length);
                        let total = document.querySelector('.totalAdvisory');
                        if (total) {
                            total.remove();
                        }
                        $('#pagingAdvisory').empty();
                        loadDataAdvisory(resp);
                        $('#pagingAdvisory').append(_.paging('#ticket-advisory', resp.paging));
                    } else {
                        swal({
                            title: "Thông báo",
                            text: "Không tìm thấy các trường phù hợp",
                            type: "warning",
                            confirmButtonColor: "#DD6B55",
                            confirmButtonText: "Xác nhận!",
                            closeOnConfirm: true
                        });
                    }
                } else {
                    swal({ title: 'Cảnh báo!', text: resp.message });
                }
            })
        } else {
            _Ajax("/ticket-advisory?search=ticket&" + $.param(filter), 'GET', {}, function (resp) {
                if (resp.code == 200) {
                    $('#body-table').empty();
                    if (resp.data.length) {
                        console.log(resp.data.length);
                        let total = document.querySelector('.totalAdvisory');
                        if (total) {
                            total.remove();
                        }
                        $('#pagingAdvisory').empty();
                        loadDataAdvisory(resp);
                        $('#pagingAdvisory').append(_.paging('#ticket-advisory', resp.paging));
                    }
                } else {
                    swal({ title: 'Cảnh báo!', text: resp.message });
                }
            })
        }

    };


    // Hiển thị dữ liệu lên giao diện
    var loadDataAdvisory = function (resp) {
        console.log(1111, resp);

        var template = '<tr>' +
            '<td>{0}</td>' +
            '<td>{1}</td>' +
            '<td>{2}</td>' +
            '<td>{3}</td>' +
            '<td>{4}</td>' +
            '<td>{5}</td>' +
            '<td class="text-center"><a class="p-t-3 btn-flat-bg" href="#ticket-advisory/{6}/edit" data-toggle="tooltip" data-placement="top" data-original-title=""><i class="zmdi zmdi-edit c-green f-17"></i></a></td>' +
            '</tr>';

        var rows = '';
        resp.data.forEach(function (el) {
            if (_.isEmpty(el)) return;
            rows += template.str(
                el.advisoryTypeId ? el.advisoryTypeId.nameAdvice : '',
                el.content ? el.content : '',
                el.idCustomer ? el.idCustomer.field_ho_ten ? el.idCustomer.field_ho_ten : '' : '',
                el.idCustomer ? el.idCustomer.field_so_dien_thoai : '',
                el.createBy ? el.createBy.displayName : '',
                el.created ? moment(el.created).format('DD/MM/YYYY HH:mm') : '',
                el ? el._id : ''
            );
        });

        $('#body-table').html(rows);
        window.MainContent.loadTooltip();
    };



    // $(document).ready(function () {
    //     bindValue();
    //     bindClick();
    //     getFilterAdvisoryTicket();
    //     // $('#btn-new-Advisory').attr('style', 'display:none')
    // })


    return {
        init: function () {
            bindValueAdvisory();
            bindClickAdvisory();
            getFilterAdvisoryTicket(false);
            $('#btn-new-Advisory').attr('style', 'display:none')
            window.onbeforeunload = null;
            $('.multi-date-picker').datepicker({
                multidate: 2,
                multidateSeparator: ' - ',
                format: 'dd/mm/yyyy'
            });
            if (_idCustomer) $('#khachhang').attr('style', 'display:none')
        },
        uncut: function () {

        }
    };
}(jQuery);