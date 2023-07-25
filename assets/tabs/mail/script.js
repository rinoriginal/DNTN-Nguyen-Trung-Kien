
window.mail_filter = {
    mail_type: 2,
    readed: 0
};

window.forwardMail = null;


var _tabMailFilter = {
    'mail-danh-sach-mail': {
        from: '',
        content: '',
        header: '',
        file: '',
        date: '',
        page: 1,
        sort: ''
    },
    'mail-danh-sach-mail-nhan': {
        from: '',
        content: '',
        header: '',
        file: '',
        date: '',
        page: 1,
        sort: ''
    },
    'mail-danh-sach-mail-gui': {
        from: '',
        content: '',
        header: '',
        file: '',
        date: '',
        page: 1,
        sort: ''
    },
    'mail-danh-sach-spam': {
        from: '',
        content: '',
        header: '',
        file: '',
        date: '',
        page: 1,
        sort: ''
    },
    'mail-danh-sach-mail-spam': {
        from: '',
        page: 1,
        sort: ''
    },
}
var _currentTable = "mail-danh-sach-mail";

function MailFilterParams(params) {

    // trungdt - lấy tên bảng tương ứng từ attr data-table của bootstrapTable khi khai báo trong file ejs 
    var _table = $(this).attr('table');

    var _limit = !!params['limit'] ? parseInt(params['limit']) : 10;
    var _offset = !!params['offset'] ? parseInt(params['offset']) : 0;
    var _page = _offset / _limit + 1;

    // trungdt - sort có format {tên trường}:{chiều} ~ example -> created:desc
    if (!!params['sort']) _tabMailFilter[_table]['sort'] = params['sort'] + ':' + params['order'];

    // trungdt - lấy dữ liệu lọc từ input trên giao diện tương ứng của từng bảng
    var _content = $(`#${_table} input[id="content-search"]`).val();
    var _header = $(`#${_table} input[id="header-search"]`).val();
    var _file = $(`#${_table} input[id="file-search"]`).val();
    var _date = $(`#${_table} input[id="date-search"]`).val();
    var _from = $('#mail-search').val();

    // trungdt - kiểm tra dữ liệu lọc, nếu có thay đổi so với lần lọc trước thì chuyển về trang 1
    if (_content != _tabMailFilter[_table]['content'] ||
        _header != _tabMailFilter[_table]['header'] ||
        _file != _tabMailFilter[_table]['file'] ||
        _date != _tabMailFilter[_table]['date'] ||
        _from != _tabMailFilter[_table]['from']) {

        _page = 1;

        // trungdt - cập nhật lại biến lưu dữ liệu lọc cũ để kiểm tra cho lần lọc kế tiếp
        _tabMailFilter[_table]['content'] = _content;
        _tabMailFilter[_table]['header'] = _header;
        _tabMailFilter[_table]['file'] = _file;
        _tabMailFilter[_table]['date'] = _date;
        _tabMailFilter[_table]['from'] = _from;
        _tabMailFilter[_table]['page'] = _page;

        // trungdt - reload lại table ở trang 1, cần dùng cẩn thận vì function selectPage sẽ gọi lại chính MailFilterParams
        $(`#${_table} table`).bootstrapTable('selectPage', 1);
        return false;
    }

    // trungdt - cập nhật lại biến lưu dữ liệu lọc cũ để kiểm tra cho lần lọc kế tiếp
    _tabMailFilter[_table]['content'] = _content;
    _tabMailFilter[_table]['header'] = _header;
    _tabMailFilter[_table]['file'] = _file;
    _tabMailFilter[_table]['date'] = _date;
    _tabMailFilter[_table]['from'] = _from;
    _tabMailFilter[_table]['page'] = _page;

    // trungdt - loại bỏ param không có giá trị như null, '', undefined
    return _.pick(_tabMailFilter[_table], el => !!el);
};

function truncateOnWord(str, limit) {
    var trimmable = '\u0009\u000A\u000B\u000C\u000D\u0020\u00A0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u2028\u2029\u3000\uFEFF';
    var reg = new RegExp('(?=[' + trimmable + '])');
    var words = str.split(reg);
    var count = 0;
    return words.filter(function (word) {
        count += word.length;
        return count <= limit;
    }).join('');
};

function TableCellDateFormat(value) {
    return moment(value, 'DD/MM/YYYY HH:mm:ss', true).isValid() ? moment(value, 'DD/MM/YYYY HH:mm:ss').format("DD/MM/YYYY HH:mm") : moment(value).format("DD/MM/YYYY HH:mm");
}
let time = 0;

// On change paste keyup.
$('#mail-search').on('input', function () {
    // Reset the timer
    clearTimeout(time);

    time = setTimeout(function () {
        reloadData();
    }, 1000);
});

function tabEmailHideSpamButton() {
    $(`#${_currentTable} .spam-button`).each(el => $(`#${_currentTable} .spam-button`)[el].style.display = 'none');
}

function loadButton() {
    if ($(`#${_currentTable} .selected`)[0]) {
        $(`#${_currentTable} .spam-button`).each(el => $(`#${_currentTable} .spam-button`)[el].style.display = 'block');
    } else {
        $(`#${_currentTable} .spam-button`).each(el => $(`#${_currentTable} .spam-button`)[el].style.display = 'none');
    }
}

function reloadData() {
    console.log("------ reloadData ------- ");
    $('#mail-danh-sach-mail table').bootstrapTable('refresh');
    $('#mail-danh-sach-mail-nhan table').bootstrapTable('refresh');
    $('#mail-danh-sach-mail-gui table').bootstrapTable('refresh');
    $('#mail-danh-sach-spam table').bootstrapTable('refresh');
    $('#mail-danh-sach-mail-spam table').bootstrapTable('refresh');
}

function validateEmail(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
}

function deleteSpamMail(_id) {
    // delete record
    _Ajax('/mail-spam/' + _id, 'PUT', [{ "spam": 0 }], function (resp) {
        reloadData();
    });
}

function addSpamMail() {
    // add record
    var $result = $("#result");
    var input_mail = $('#input_mail_spam').val();
    if (validateEmail(input_mail)) {
        console.log(44, input_mail)
        _Ajax('/mail-spam', 'POST', [{ "emails": input_mail }], function (resp) {
            $('#spamModal').modal('hide');
            reloadData();
        })

        document.getElementById('spamButton').style.display = 'none';
        document.getElementById('notSpamButton').style.display = 'none';
    } else {
        $result.text(input_mail + " không hợp lệ!");
        $result.css("color", "red");
    }
}

function spamBtn(type) {
    switch (type) {
        case 0:
            table = document.getElementById("tbl-new");
            break;
        case 1:
            table = document.getElementById("tbl-unprogressing");
            break;
        case 2:
            table = document.getElementById("tbl-progressing");
            break;
    }
    tr = table.getElementsByTagName("tr");

    let _arr = [];
    for (i = 1; i < tr.length; i++) {
        if (tr[i].getAttribute("class") == "selected") _arr.push(tr[i].getAttribute("id"));
    }

    _Ajax('/mail-spam', 'POST', [{ "add": _arr }], resp => {
        tabEmailHideSpamButton();
        reloadData();
    });
}

function notSpamBtn() {
    table = document.getElementById("tbl-progressed");
    tr = table.getElementsByTagName("tr");
    let _arr = [];
    for (i = 1; i < tr.length; i++) {
        if (tr[i].getAttribute("class") == "selected") _arr.push(tr[i].getAttribute("id"));
    }

    _Ajax('/mail-spam', 'POST', [{ "remove": _arr }], resp => {
        tabEmailHideSpamButton();
        reloadData();
    });
}

function listMailConvertAttachment(value, row) {
    if (!value || !row || value.length == 0) return '';
    let _arr = [];
    _.each(value, el => {
        _arr.push(_.last(el.split('/')));
    });
    return _arr.toString();
}

function setValueTrueF(idMail) {
    window.forwardMail = idMail;
}

(function ($) {
    "use strict";
    var TABTEMPLATE = [];
    var REPLACEMENTS = {};

    var _this = function (s) {
        return _.trim('body > .tab-content > .tab-pane#tab-mail ' + s);
    };

    var _rTemplate = function (str) {
        return str.replace(/(\%(.*)\%)/igm, "<span class='m-t' style='background-color: #ff0'>%\$2\%</span>");
    };

    var decodeEntities = (function () {
        var element = document.createElement('div');

        function decodeHTMLEntities(str) {
            if (str && typeof str === 'string') {
                // strip script/html tags
                str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
                str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');
                element.innerHTML = str;
                str = element.textContent;
                element.textContent = '';
            }

            return str;
        }

        return decodeHTMLEntities;
    })();

    var _currentMail = {};
    var _currentData = {};
    var MailContainer = window.MailContainer = Object.create({
        init: function () {
            this.container = $(_this);
            this.counter = 0;
            this.tabCounter = Object.create({
                counter: 0,
                tab: $('ul.main-tabs a[href="#tab-mail"]'),
                bagde: $('ul.main-tabs a[href="#tab-mail"] i.tmn-counts'),
                update: function (add) {
                    add ? this.counter += add : (this.counter == 0 ? 0 : this.counter--);
                    add ? this.tab.removeClass('blink').addClass('blink') : null;
                    console.log("update counter ", this.counter);
                    this.bagde.text(this.counter);
                    this.counter ? this.bagde.show() : this.bagde.hide();
                    return this.parent;
                }
            });
            this.tabCounter.parent = this;
            return this;
        },
        addRow: function (table, row, type) {
            // $(_this('#mail-tbl-' + table + '-container table')).bootstrapTable('insertRow',
            //     {
            //         index: -1,
            //         row: _.extend(_.omit(row, 'body_raw', 'subject_raw'), {
            //             body: truncateOnWord(row.body, 200),
            //             checked: false,
            //             created: moment(row.created).format('DD/MM/YYYY')
            //         })
            //     });
            // $(_this('#mail-tbl-' + table + '-container table')).bootstrapTable('refresh');
            return this;
        },
        removeRow: function (table, row) {
            console.log(_.omit(row, 'body_raw', 'subject_raw'));
            return this;
        },
        updatedCustomer: function (customer) {
            console.log(customer);
        },
        updatedTicket: function (data) {
            if (data.ticket && !_.isUndefined(_currentMail)) {
                _currentMail.mail_status = data.ticket.status;
            }
        }
    });
    var data_agent = [];
    window.forwardIdAgent = "";
    window.forwardIdGroup = "";
    window.dataUserForward = {};
    $(document).ready(function () {
        function actionForward() {
            _Ajax('/mail-forward?forward=true', 'GET', {}, function (resp) {
                data_agent = resp
                selectizeForward(function (err, data) {
                    window.dataUserForward = data.options;
                    data.on('change', function () {
                        window.forwardIdAgent = data.items;
                    })
                });
                $('#forwardModal').modal('show');
            })

        }

        var REGEX_EMAIL = '([a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@' +
            '(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)';

        function selectizeForward(callback) {
            $('#select-to').selectize({
                persist: false,
                maxItems: null,
                valueField: '_id',
                labelField: 'name',
                searchField: ['name'],
                options: data_agent,
                render: {
                    item: function (item, escape) {
                        return '<div>' +
                            (item.name ? '<span >' + escape(item.name) + '</span>' : '') +

                            '</div>';
                    },
                    option: function (item, escape) {
                        var label = item.name || item.email;
                        var caption = item.email || " (Group)";
                        return '<div class="form-control">' +
                            '<span class="">' + escape(label) + '</span>' + '---' +
                            (caption ? '<span class="">' + escape(caption) + '</span>' : '') +
                            '</div>';
                    }
                },
                createFilter: function (input) {
                    var match, regex;

                    // email@address.com
                    regex = new RegExp('^' + REGEX_EMAIL + '$', 'i');
                    match = input.match(regex);
                    if (match) return !this.options.hasOwnProperty(match[0]);

                    // name <email@address.com>
                    regex = new RegExp('^([^<]*)\<' + REGEX_EMAIL + '\>$', 'i');
                    match = input.match(regex);
                    if (match) return !this.options.hasOwnProperty(match[2]);

                    return false;
                },
                create: function (input) {
                    if ((new RegExp('^' + REGEX_EMAIL + '$', 'i')).test(input)) {
                        return { email: input };
                    }
                    var match = input.match(new RegExp('^([^<]*)\<' + REGEX_EMAIL + '\>$', 'i'));
                    if (match) {
                        return {
                            email: match[2],
                            name: $.trim(match[1])
                        };
                    }
                    alert('Invalid email address.');
                    return false;
                }
            });
            callback(null, $('#select-to')[0].selectize)
        }

        var tuongTac = 0;

        var STEMPLATE = null;

        setInterval(function () {
            if (tuongTac == 1 && $('#detail-mail:visible').length <= 0) {
                tuongTac = 0;
                // cập nhật trạng thái tương tác của agent off
                _socket.emit("EmailTuongTac", {
                    status: 0,
                    _id: user
                });
            }

            if (tuongTac == 0 && $('#detail-mail:visible').length > 0) {
                tuongTac = 1;
                // cập nhật trạng thái tương tác của agent on
                _socket.emit("EmailTuongTac", {
                    status: 1,
                    _id: user
                });
            }
        }, 1000);

        $(this).on('click', _this('#mail-search-button-all'), function () {
            window.mail_filter = {};
            $('#tbl-new').bootstrapTable('refresh');
            $(_this('#list-mail')).show();
            $(_this('#detail-mail')).hide();
        })

        $(this).on('click', _this('#mail-search-button-inbox'), function () {
            window.mail_filter = {};
            $(_this('#mail-danh-sach-mail-nhan table')).bootstrapTable('refresh');
            $(_this('#list-mail')).show();
            $(_this('#detail-mail')).hide();
        })
        $(this).on('click', _this('#mail-search-button-sent'), function () {
            window.mail_filter = {};
            $(_this('#mail-danh-sach-mail-gui table')).bootstrapTable('refresh');
            $(_this('#list-mail')).show();
            $(_this('#detail-mail')).hide();
        })
        $(this).on('click', _this('#mail-search-button-spam'), function () {
            window.mail_filter = {};
            $(_this('#mail-danh-sach-spam table')).bootstrapTable('refresh');
            $(_this('#list-mail')).show();
            $(_this('#detail-mail')).hide();
        })

        $(this).on('click', _this('#mail-task-lists a.task'), function () {
            var $this = $(this);
            var query = '?';
            switch ($this.data('type')) {
                case 'new':
                    window.mail_filter = {
                        //readed: 0
                    };
                    break;
                case 'unprogressing':
                    window.mail_filter = {
                        //readed: 1

                    };
                    break;
                case 'progressing':
                    window.mail_filter = {
                        //readed: 1,
                        //ticket: 1

                    };
                    break;
                case 'progressed':
                    window.mail_filter = {
                        //readed: 1,
                        //ticket: 2
                        box: 3
                    };
                    break;
            }

            window.mail_filter['page'] = $(_this('#mail-tbl-' + $this.data('type') + '-container .pagination .page-number.active')).text() || 1;
            $(_this('#mail-tbl-' + $this.data('type') + '-container table')).bootstrapTable('refresh');
            $(_this('#list-mail')).show();
            $(_this('#detail-mail')).hide();

            //$('#iframe1').contents().find('html')
            //_Ajax('/mail-client?' + $.param(query), 'GET', [], function (resp) {
            //    if (!_.isEqual(resp.code, 200)) return;
            //    $(_this('#mail-tbl-' + $this.data('type') + '-container table')).bootstrapTable('removeAll');
            //    _.each(resp.data, function (m) {
            //        MailContainer.addRow($this.data('type'), m, 'prepend');
            //    });
            //    $this.addClass('active').siblings('.task').removeClass('active');
            //});

            $this.addClass('active').siblings('.task').removeClass('active');
            $($this.data('target')).show().siblings(':not(.lv-header-alt)').hide();
            $(_this('.lv-header-alt h2.lvh-label')).text($this.data('text'));
            //MailContainer.detail.h(function () {
            //    _currentMail = {};
            //    MailContainer.lists.s();
            //});
        });
        $(this).on('click', _this('#detail-mail button.btn-reply'), function () {
            _currentMail.body = decodeEntities(_.trim(_.stripTags(CKEDITOR.instances['reply-container'].document.getBody().getHtml())));
            if (!_currentMail.body.length) return;
            _currentMail.body_raw = CKEDITOR.instances['reply-container'].getData();
            //_currentMail.body_raw = CKEDITOR.instances['reply-container'].document.getBody().getHtml();
            var formData = new FormData();
            $.each(_currentMail, function (i, o) {
                formData.append(i, o);
            });
            if (formData.append('attachments', $('#mail-attachments')[0])) {
                formData.append('attachments', $('#mail-attachments')[0].files[0]);

            }
            _AjaxData('/mail-client', 'POST', formData, function (resp) {
                if (_.isEqual(resp.code, 200)) {
                    reloadData();
                    $(_this('#mail-task-lists a.task.active')).trigger('click');
                } else {
                    console.log(resp);
                    swal({ title: 'Thông báo !', text: resp["message"] + ' ' + resp["code"] });
                }
            });
        });
        $(this).on('click', _this('#forwardButtonIndex'), function () {
            _Ajax('/mail-manager', 'POST', [{ mail: window.forwardMail }, { agent: window.forwardIdAgent }], function (resp) {
                if (resp.code != 200) {
                    swal({ title: 'Thất bại !', text: !!resp.data ? resp.data.message : '' });
                    return;
                }
                swal({ title: 'Thành công' });
                $('#forwardModal').modal('hide');
            });
        });
        $(this).on('click', _this('.btn-refresh-tbl'), function () {
            var $this = $(this);
            window.mail_filter = {};
            $(_this('#mail-tbl-' + $this.data('type') + '-container table')).bootstrapTable('refresh');
            $(_this('#list-mail')).show();
            $(_this('#detail-mail')).hide();
        });

        $(this).on('change', '#tw-switch', function () {
            _socket.emit("changeEmailStatus", {
                id: window.user,
                value: Number($(this).is(":checked"))
            });
        });

        $('#tab-danh-sach-mail').on('click', function () {
            _currentTable = "mail-danh-sach-mail";
        })

        $('#tab-danh-sach-mail-nhan').on('click', function () {
            _currentTable = "mail-danh-sach-mail-nhan";
        })

        $('#tab-danh-sach-mail-gui').on('click', function () {
            _currentTable = "mail-danh-sach-mail-gui";
        })

        $('#tab-danh-sach-spam').on('click', function () {
            _currentTable = "mail-danh-sach-spam";
        })

        $('#tab-danh-sach-mail-spam').on('click', function () {
            _currentTable = "mail-danh-sach-mail-spam";
        })

        $('#forwardModal').on('hidden.bs.modal', function () {
            window.forwardMail = null;
            window.forwardIdAgent = [];
            var $select = $('#select-to').selectize();
            var control = $select[0].selectize;
            control.clear();
        })

        //$(this).on('click', _this('table[data-toggle="table"] tr'), function () {
        //    $(_this('#list-mail')).hide();
        //    $(_this('#detail-mail')).show();
        //});

        $(_this('table[data-toggle="table"]')).on('click-row.bs.table', function (e, row, $element) {
            if (!!window.forwardMail) {
                actionForward();
                return;
            }

            _currentMail = { from: row.to, to: row.from, subject: row.subject, subject_raw: row.subject_raw, mailId: row._id, attachments: row.attachments };

            CKEDITOR.instances['reply-container'].setData('');
            if (row.subject_raw) {
                $(_this('#list-mail')).hide();
                $(_this('#detail-mail > h4')).text(row.subject_raw);
                $(_this('#detail-mail #from.text-muted')).text(row.from);
                $(_this('#detail-mail .content iframe')).contents().find('html').html(row.body_raw);
                $(_this('#detail-mail')).show();
                $(_this('#detail-mail a[href="#tab-1"]')).trigger('click');

                // trungdt - click vào link trong nội dung email sẽ mở tab mới
                $(_this('#detail-mail .content iframe')).contents().find('a').each(el => {
                    if (!$(_this('#detail-mail .content iframe')).contents().find('a')[el].getAttribute('href')) return;
                    $(_this('#detail-mail .content iframe')).contents().find('a')[el].setAttribute('target', '_blank');
                })
            }
            if (row.service) {
                $(_this('#detail-mail .tab-content #tab-2')).empty().append(_.Tags([
                    { tag: 'iframe', attr: { style: 'width: 100%;border: none;min-height: 500px;', src: '/ticket?' + $.param({ type: 'mail', service: row.service._id, mailId: row._id, field_e_mail: _.trim(row.from) }) } }
                ]));
            } else {
                $(_this('#detail-mail .tab-content #tab-2')).empty();
            }

            if (!!row.attachments && row.attachments.length > 0) {
                var _html = []
                _.each(row.attachments, el => {
                    _html.push(`<span title="${el}"><a href="/assets/uploads/attachments/${el}" target="_blank">${el}</a></span>`);
                })
                $(_this('#detail-mail #detail-mail-attachments')).html(_html.toString());

            }

            if (row.service) {
                _Ajax('/mail?companyId=' + row.service.idCompany, 'GET', [], function (resp) {
                    if (_.isEqual(resp.code, 200)) {
                        var _listCategory = [];
                        TABTEMPLATE = [];
                        _.each(resp.data, function (t, i) {
                            _listCategory.push({
                                tag: 'div', attr: { class: 'panel-heading', role: 'tab', id: 'collapse-' + i },
                                childs: [
                                    {
                                        tag: 'h5', attr: { class: 'panel-title' },
                                        childs: [{ tag: 'a', attr: { class: 'btn-block', 'data-parent': '#mail-template-list', role: 'button', 'data-toggle': 'collapse', href: '#collapse-g-' + i, 'aria-controls': 'collapse-g-' + i }, content: t.ids.name }]
                                    }
                                ]
                            }, {
                                    tag: 'div', attr: { class: 'panel-collapse collapse', role: 'tabpanel', id: 'collapse-g-' + i, 'aria-labelledby': 'collapse-' + i },
                                    childs: [
                                        {
                                            tag: 'ul', attr: { class: 'list-group' },
                                            childs: _.chain(t.ids.templates).map(function (e) {
                                                return { tag: 'li', attr: { class: 'list-group-item' }, childs: [{ tag: 'div', attr: { class: 'contact h-card', draggable: true, 'data-id': e._id }, content: e.name }] };
                                            }).value()
                                        }
                                    ]
                                });
                            _.each(t.ids.templates, function (v) {
                                TABTEMPLATE[v._id] = v.body;
                            });
                        });
                        $(_this('#detail-mail .tab-content #tab-1 #tab-mail-template-list')).html(_.Tags(_listCategory));
                    }
                });
            }

            _Ajax('/mail-client/' + row._id, 'PUT', [{ readed: 1 }], function (resp) {
                // start - trungdt - fix lỗi khi đọc mail mới không giảm notification 
                if (!!MailContainer.tabCounter && !!MailContainer.tabCounter.counter) MailContainer.tabCounter.update(-1);
                reloadData();
                // end - trungdt - fix lỗi khi đọc mail mới không giảm notification 
            });
        });

        _socket.on('MailForward', function (data) {
            console.log(462, data);
        });

        _socket.on('connect', function (data) {
            console.log(this.id);
        });

        _socket.on('MailSentResponse', function (data) {
            console.log(data);
        });

        _socket.on('MailComming', function (data) {
            console.log("MailComming ----------- ", data);
            var _totalUpdate = 1;
            if (!!data.total) _totalUpdate = data.total;
            MailContainer.addRow('new', data, 'prepend').tabCounter.update(_totalUpdate);
            reloadData();
        });

        CKEDITOR.document.getById('tab-mail-template-list').on('dragstart', function (evt) {
            if (!_.has(evt.data.getTarget().$.attributes, 'draggable')) return false;
            var target = evt.data.getTarget().getAscendant('div', true);
            CKEDITOR.plugins.clipboard.initDragDataTransfer(evt);
            var dataTransfer = evt.data.dataTransfer;
            dataTransfer.setData('content', TABTEMPLATE[target.data('id')]);
            dataTransfer.setData('text/html', target.getText());
            if (dataTransfer.$.setDragImage) {
                //console.log(dataTransfer);
                //dataTransfer.$.setDragImage(target.findOne('img').$, 0, 0);
            }
        });
        if (!_.has(CKEDITOR.plugins.registered, 'replytpl')) {
            CKEDITOR.plugins.add('replytpl', {
                requires: 'widget',
                init: function (editor) {
                    editor.widgets.add('stemplate', {
                        allowedContent: 'span(!m-t); a[href](!u-email,!p-name); span(!p-tel)',
                        requiredContent: 'span(m-t)',
                        pathName: 'stemplate',
                        upcast: function (el) {
                            return el.name == 'span' && el.hasClass('m-t');
                        }
                    });
                    editor.addFeature(editor.widgets.registered.stemplate);
                    editor.on('paste', function (evt) {
                        var _content = evt.data.dataTransfer.getData('content');
                        if (_content) evt.data.dataValue = _rTemplate(_content);
                        CKEDITOR.instances['reply-container'].updateElement();
                    });
                }
            });
        }

        $(_this('#reply-container')).ckeditor({ entities: false, basicEntities: false, entities_greek: false, entities_latin: false, removePlugins: 'elementspath', extraPlugins: 'replytpl,dialog' });

        MailContainer.init();
    });
})(jQuery);