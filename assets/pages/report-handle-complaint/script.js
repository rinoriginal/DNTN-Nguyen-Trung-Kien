/* { author: haivh } */
var DFT = function ($) {

    var body = document.querySelector("#container");
    /**
     * Bắt sự kiện click
     */
    var bindClick = function () {

        // Click nút Lọc/Search
        $('#searchComplaint').click(function () {
            queryFilterComplaint(true);
        });

        // Load lại trang
        $(document).on('click', '.zmdi-refresh', function () {
            _.LoadPage(window.location.hash);
        });
        $(document).on('click', '.pagination li a', function (e) {
            e.preventDefault();
            queryFilterComplaint(false, $(this).attr('data-link'));
        });


        // fix lỗi search 
        // $(document).on('click', '.pagination li a', function (e) {
        //     e.preventDefault();
        //     var page = !_.isNaN(parseInt($(this).data('page'))) ? parseInt($(this).data('page')) : 1;
        //     console.log('search: ' + page);
        //     queryFilterComplaint(page);
        // });


    };

    // Lấy dữ liệu search và gửi lên server
    var queryFilterComplaint = function (load, page) {
        var filter = _.chain($('.input'))
            .reduce(function (memo, el) {
                if (!_.isEqual($(el).val(), '') && !_.isEqual($(el).val(), null)) memo[el.name] = $(el).val();
                return memo;
            }, {}).value();

        if (page) {
            filter.page = page;
        }
        console.log(66666666, JSON.stringify(filter));

        if (load == true) {
            _Ajax("/report-handle-complaint?" + $.param(filter), 'GET', {}, function (resp) {
                if (resp.code == 200) {
                    $('#tbBody').empty();
                    if (resp.data.length) {
                        console.log(99999, resp.data);

                        loadDataComplaint(resp);
                        $('#paging').html(createPaging(resp.paging));
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
                    swal({ title: 'Cảnh báo !', text: resp.message });
                }
            })
        }
        if (!load) {
            _Ajax("/report-handle-complaint?" + $.param(filter), 'GET', {}, function (resp) {
                if (resp.code == 200) {
                    $('#tbBody').empty();
                    if (resp.data.length) {

                        loadDataComplaint(resp);
                        $('#paging').html(createPaging(resp.paging));
                    }
                }
            })
        }


    };


    /**
     * Hiển thị tên trường/cột theo file config
     */
    var bindValue = function () {
        var temp = [];
        _.each(_.allKeys(_config.MESSAGE.RESTA_TABLE), function (item) {
            var obj = $('.' + item);

            if (obj.prop('tagName')) {

                obj.html(_config.MESSAGE.RESTA_TABLE[item]);

                var index = obj.closest('th').index();
                temp[index] = '<li class="p-l-15 p-r-20"> ' +
                    '<div class="checkbox">' +
                    '<label> ' +
                    '<input type="checkbox" class="select-box column-display" data-index="' + index + '" checked>' +
                    '<i class="input-helper"></i>' +
                    '<a class="p-l-5 text-capitalize text-nowrap">' + _config.MESSAGE.RESTA_TABLE[item] + '</a>' +
                    '</label>' +
                    '</div>' +
                    '</li>';
            }
        });
        $('#showHideFields').append(temp.join(''));
    };
    function createPaging(paging, classPaging) {
        console.log(paging);

        if (!paging) return '';
        var firstPage = paging.first ? '<li><a class="' + classPaging + '" data-link="' + paging.first + '">&laquo;</a></li>' : '';
        var prePage = paging.previous ? '<li><a class="' + classPaging + '" data-link="' + paging.previous + '">&lsaquo;</a></li>' : '';
        var pageNum = '';
        for (var i = 0; i < paging.range.length; i++) {
            if (paging.range[i] == paging.current) {
                pageNum += '<li class="active"><span>' + paging.range[i] + '</span></li>';
            } else {
                pageNum += '<li><a class="' + classPaging + '" data-link="' + paging.range[i] + '">' + paging.range[i] + '</a></li>';
            }
        }
        var pageNext = paging.next ? '<li><a class="' + classPaging + '" data-link="' + paging.next + '">&rsaquo;</a></li>' : '';
        var pageLast = paging.last ? '<li><a class="' + classPaging + '" data-link="' + paging.last + '">&raquo;</a></li>' : '';
        return '<div class="paginate text-center">' + '<ul class="pagination">' + firstPage + prePage + pageNum + pageNext + pageLast + '</ul></div>';
    };
    //hiển thị dữ liệu lên giao diện
    var loadDataComplaint = function (resp) {
        console.log(1111111111111111, resp);

        var template = '<tr style="height:35px !important">' +
            '<td class="text-center" style="width:40px" title="{0}">{0}</td>' +
            '<td class="text-center" style="width:100px" title="{1}">{1}</td>' +
            '<td class="text-center" style="width:240px" title="{2}">{2}</td>' +
            '<td class="text-center" style="width:1px" title="{3}">{3}</td>' +
            '<td class="text-center" style="width:50px" title="{4}">{4}</td>' +
            '<td class="text-center" style="width:140px" title="{5}">{5}</td>' +
            '<td class="text-center" style="width:140px" title="{6}">{6}</td>' +
            '<td class="text-center" style="width:140px" title="{7}">{7}</td>' +
            '<td class="text-center" style="width:140px" title="{8}">{8}</td>' +
            '<td class="text-center" style="width:140px" title="{9}">{9}</td>' +
            '<td class="text-center" style="width:140px" title="{10}">{10}</td>' +
            '<td class="text-center" style="width:140px" title="{11}">{11}</td>' +
            '<td class="text-center" style="width:140px" title="{12}">{12}</td>' +
            '</tr>';

        var rows = '';
        var _areas = {};
        _.each(areas, function (el) {
            Object.assign(_areas, _.chain(areasProvinces.PROVINCES)
                .reduce(function (memo, item) {
                    if (item.typeArea == el.value) memo[item.name] = el.name
                    return memo;
                }, {})
                .value()
            );
        })
        let convertAreas = function (province) {
            let xxx = ''
            _.each(Object.keys(_areas), function (el) {
                if (el == province) xxx = _areas[el]
            })
            return xxx;

        }

        resp.data.forEach(function (el, i) {
            if (_.isEmpty(el)) return;

            // sum += (el.priceRelease.reduce((a, b) => a + b, 0) - el.priceOriginal.reduce((a, b) => a + b, 0))

            var convertChannelType = function (el) {
                let _name = ''
                switch (Number(el)) {
                    case 1:
                        _name = 'Social Listening';
                        break;
                    case 2:
                        _name = 'Social Comment';
                        break;
                    case 3:
                        _name = 'Email survey';
                        break;
                    case 4:
                        _name = 'Email support';
                        break;
                    case 5:
                        _name = 'Hotline 19006622';
                        break;
                    case 6:
                        _name = 'Others';
                        break;
                }
                return _name;
            }
            var convertStatus = function (el) {
                let _name = ''
                switch (Number(el)) {
                    case 0:
                        _name = 'Đang xử lý';
                        break;
                    case 1:
                        _name = 'Tạm dừng';
                        break;
                    case 2:
                        _name = 'Đã hoàn thành';
                        break;
                }
                return _name;
            }
            rows += template.str(
                (moment(el.created).format('DD/MM/YYYY HH:mm A')),
                (convertStatus(el.status)),
                (el.channelType ? convertChannelType(el.channelType) : ''),
                (el.provinceId ? convertAreas(el.provinceId) : ''),
                (el.brand ? el.brand.name : ''),
                (el.restaurant ? el.restaurant : ''),

                (el.complaintType ? el.complaintType : ''),
                (el.problem ? el.problem : ''),
                (el.content ? el.content : ''),
                (el.customerName ? el.customerName : ''),
                (el.customerPhone ? el.customerPhone : ''),
                (el.agent ? el.agent : ''),
                (moment(el.deadline).format('DD/MM/YYYY HH:mm A')),
                (el._id),

            );
        })
        if (body){
            body.insertAdjacentHTML('afterend', `<div class="text-center total" id='sum' style="padding-top:10px;display:none"><b><span class="TXT_TOTAL">Tổng</span>:<span class="bold c-red" id="ticket-total">${resp.paging.totalResult}</span></b></div>`)
        }
        $('#tbBody').html(rows);
    };


    return {
        init: function () {
            queryFilterComplaint(false);
            bindValue();
            bindClick();
            $('.container').attr('class', 'container-fluid m-b-10')
            // Hiển thị thông báo khi không tìm thấy kết quả
            if (Object.keys(window.location.obj).length > 0) {
                delete window.location.obj['sort'];
                swal({
                    title: 'Không tìm thấy kết quả',
                    text: 'Không có kết quả',
                    type: "warning",
                    confirmButtonColor: "#DD6B55",
                    confirmButtonText: "Quay lại!",
                    closeOnConfirm: true
                }, function () {
                    window.history.back();
                });
            };


            $('.selectpicker').selectpicker('refresh');

            // Hiển thị dữ liệu sắp xếp
            if (_.has(window.location.obj, 'sort')) {
                var _sort = window.location.obj.sort.split(':');
                $('th[sortName="' + _sort[0] + '"]').attr('data-sort', _sort[1]);
            }

            window.onbeforeunload = null;
            $('.multi-date-picker').datepicker({
                multidate: 2,
                multidateSeparator: ' - ',
                format: 'dd/mm/yyyy'
            });

            $('#btn-new-complaint').attr("style", "display:none")

        },
        uncut: function () {
            // xóa sự kiện khi rời trang
            $(document).off('click', '.sort');
            $(document).off('click', '#btn-search');
            $(document).off('click', '.zmdi-refresh');
            $(document).off('click', '.pagination li a');

            $(document).off('click', '.btn-edit');

        }
    };

}(jQuery);