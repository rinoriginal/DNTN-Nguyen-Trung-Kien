var DFT = function ($) {

    var filter = {};

    var bindClick = function () {
        $(document).on('change', 'select[name=filter-company]', function () {

            if (_.isEmpty($(this).val())) {
                delete filter['company'];

                $('select[name=filter-campaign]').empty();
                delete filter['campaign'];

                $('select[name=filter-campaign]').append('<option value="">- Tất cả -</option>');

                _.each(services, function (g) {
                    $('select[name=filter-campaign]').append('<option value=' + "service_" + g._id + '>' + g.name + '</option>');
                });

                _.each(campaigns, function (g) {
                    $('select[name=filter-campaign]').append('<option value=' + "campaign_" + g._id + '>' + g.name + '</option>');
                });

                $('select[name=filter-campaign]').selectpicker('refresh');
                return;
            }

            var value = $(this).val();
            filter['company'] = value;

            var newServices = _.filter(services, function (el) {
                return el.idCompany == value;
            });

            var newCampaigns = _.filter(campaigns, function (el) {
                return el.idCompany == value;
            });

            $('select[name=filter-campaign]').empty();
            delete filter['campaign'];

            $('select[name=filter-campaign]').append('<option value="">- Tất cả -</option>');

            _.each(newServices, function (g) {
                $('select[name=filter-campaign]').append('<option value=' + "service_" + g._id + '>' + g.name + '</option>');
            });

            _.each(newCampaigns, function (g) {
                $('select[name=filter-campaign]').append('<option value=' + "campaign_" + g._id + '>' + g.name + '</option>');
            });

            $('select[name=filter-campaign]').selectpicker('refresh');
        });

        $(document).on('change', 'select[name=filter-campaign]', function () {
            if (_.isEmpty($(this).val())) {
                delete filter['campaign'];
                return;
            }

            filter['campaign'] = $(this).val();
        });

        $(document).on('change', 'select[name=filter-agent]', function () {
            if (_.isEmpty($(this).val())) {
                delete filter['agent'];
                return;
            }
            
            filter['agent'] = $(this).val();
        });

        $(document).on('dp.change', '#filter-start-date', function () {
            if (_.isEmpty($(this).val())) {
                delete filter['start-date'];
                return;
            }

            filter['start-date'] = $(this).val();
        });

        $(document).on('dp.change', '#filter-end-date', function () {
            if (_.isEmpty($(this).val())) {
                delete filter['end-date'];
                return;
            }

            filter['end-date'] = $(this).val();
        });

        $(document).on('change', '#filter-start-hour', function (e) {
            if (_.isEmpty($(this).val())) {
                delete filter['start-hour'];
                return;
            }
            var value = $(this).val().split(':')[0];
            var str = (value.length == 1 ? "0" : "") + value + ":00";
            $(this).val(str);
            filter['start-hour'] = str;
        });

        $(document).on('change', '#filter-end-hour', function () {
            if (_.isEmpty($(this).val())) {
                delete filter['end-hour'];
                return;
            }

            var value = $(this).val().split(':')[0];
            var str = (value.length == 1 ? "0" : "") + value + ":00";
            $(this).val(str);
            filter['end-hour'] = str;
        });

        $(document).on('click', '#filter-btn', function () {
            requestFilter();
        });

        // Nhấn phím enter
        $(document).on('keyup', function (e) {
            if (e.keyCode == 13) {
                requestFilter();
            }
        });

        $(document).on('click', '#filter-detail-total', function () {
            if (!!window.location.obj.page) filter['page'] = window.location.obj.page;
            if (!!window.location.obj.rows) filter['rows'] = window.location.obj.rows;
            filter['detail-total'] = 1;
            filter['detail-date'] = $(this).attr('data-detail');
            filter['is-detail'] = 1;
            requestFilter();
        });

        $(document).on('click', '#filter-detail-done', function () {
            if (!!window.location.obj.page) filter['page'] = window.location.obj.page;
            if (!!window.location.obj.rows) filter['rows'] = window.location.obj.rows;
            filter['detail-done'] = 1;
            filter['detail-date'] = $(this).attr('data-detail');
            filter['is-detail'] = 1;
            requestFilter();
        });

        $(document).on('click', '#filter-detail-processing', function () {
            if (!!window.location.obj.page) filter['page'] = window.location.obj.page;
            if (!!window.location.obj.rows) filter['rows'] = window.location.obj.rows;
            filter['detail-processing'] = 1;
            filter['detail-date'] = $(this).attr('data-detail');
            filter['is-detail'] = 1;
            requestFilter();
        });

        $(document).on('click', '#filter-detail-date', function () {
            if (!!window.location.obj.page) filter['page'] = window.location.obj.page;
            if (!!window.location.obj.rows) filter['rows'] = window.location.obj.rows;
            filter['detail-date'] = $(this).attr('data-detail');
            filter['is-detail'] = 1;
            requestFilter();
        });

        $(document).on('click', '#download-excel', function (e) {
            e.stopPropagation();
            e.preventDefault();

            var _hash = window.location.hash.replace('#', '');
            var url = _hash + (_hash.indexOf('?') >= 0 ? '&' : '?') + 'download-excel';
            downloadExcelReport(url);
        });

        $(document).on('click', '#download-excel-detail', function (e) {
            e.stopPropagation();
            e.preventDefault();

            var _hash = window.location.hash.replace('#', '');
            var url = _hash + (_hash.indexOf('?') >= 0 ? '&' : '?') + 'download-excel-detail';
            downloadExcelReport(url);
        });
    };


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

    var requestFilter = function () {
        window.location.hash = newUrl(window.location.hash, filter);
    };

    return {
        init: function () {
            bindClick();

            filter['start-hour'] = $('input[name=filter-start-hour]').val();
            filter['end-hour'] = $('input[name=filter-end-hour]').val();

            // Hiển thị lại tiêu chí đã lọc
            _.each(window.location.obj, function (v, k) {
                if (k.indexOf('detail') >= 0) return;
                var el = $('#filter-' + k.replace(['[]'], '').replace('.', '\\.'));
                if (el[0]) {
                    filter[k] = v;
                    switch (el.prop('tagName')) {
                        case 'INPUT':
                            el.val(v);
                            break;
                        case 'SELECT':
                            el.val(v);
                            if (el.is('.selectpicker')) {
                                el.val(v).selectpicker('refresh');
                            }
                            break;
                    }
                }
            });
        },
        uncut: function () {

        }
    };
}(jQuery);