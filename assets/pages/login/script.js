var DFT = function ($) {

    var setCookie = function (cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
        var expires = "expires=" + d.toUTCString();
        document.cookie = cname + "=" + cvalue + "; " + expires;
    };
    var getCookie = function (cname) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1);
            if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
        }
        return "";
    };

    var bindClick = function () {

    };

    /**
     * 27.Feb.2023 kiennt
     * locker remove duplicate request login
     * @type {boolean}
     */
    // Check domain 
    window._urlBinding = "https://test-chat-mail.telehub.vn"; // Chạy dưới localhost, 
    // if (window.location.hostname == "localhost") {
    // } else {
    //     window._urlBinding = window.origin + "/";
    // }
    var isLoging = false;
    window._domain = "bhs.local";
    console.log(window._urlBinding)
    window._finesse = null;
    setCookie('_username', null);
    setCookie('_password', null);
    setCookie('username', '');
    setCookie('password', '');
    setCookie('deviceId', '');
    setCookie('_extension', null);
    setCookie('_agentId', null);
    setCookie('_finesse', null);
    _jwClient = null;

    var bindSubmit = function () {
        $('#frm-login').validationEngine('attach', {
            validateNonVisibleFields: false,
            autoPositionUpdate: true,
            onValidationComplete: function (form, status) {
                if (status && !isLoging) {
                    isLoging = true;
                    _AjaxObject('/login', 'POST', form.getData(), function (resp) {


                        if (_.isEqual(resp.code, 200)) {
                            isLoging = false;
                            if (resp && !resp.agentId) {
                                window.location.href = '/';
                            }
                            // window.location.href = '/';
                            if (resp && resp.agentId) {
                                var _username = form.getData().get('name'),
                                    _password = form.getData().get('password'),
                                    _extension = resp.extension;
                                    console.log("ket qua tra ve", resp)
                                setCookie('_username', _username);
                                setCookie('_password', _password);
                                setCookie('_extension', resp.extension);
                                setCookie('_urlBinding', window._urlBinding);
                                setCookie('_domain', window._domain);
                                setCookie('username', _username);
                                setCookie('_agentId', resp.agentId);
                                setCookie('_extensionMobile', resp.extensionMobile);
                                setCookie('_dialNumber', resp.dialNumber);
                                setCookie('_isLoginMobile', resp.isLoginMobile);
                                window._finesse = undefined;
                                window._finesse = new Finesse(resp.agentId, _password);
                                console.log("chay vo day signout ")
                                _finesse.signOut(
                                    
                                    resp.agentId, _extension, null, _signOutHandler, _signOutHandler);
                            }

                        } else {
                            isLoging = false;
                            setCookie('_agentId', null);
                            setCookie('_username', null);
                            setCookie('_password', null);
                            setCookie('_extension', null);
                            setCookie('_extensionMobile', null);
                            setCookie('_dialNumber', null);
                            setCookie('_isLoginMobile', null);
                            setCookie('username', _username);
                            jQuery.ajax({ url: '/logout' });
                            $('.alert').remove();
                            $('#l-login').prepend(_.Tags([{
                                tag: 'div',
                                attr: { class: 'alert alert-danger alert-dismissible', role: 'alert' },
                                content: resp.message,
                                childs: [
                                    { tag: 'button', attr: { class: 'close', type: 'button', "data-dismiss": "alert", " aria-label": "Close" }, childs: [{ tag: 'span', attr: { "aria-hidden": true }, content: 'x' }] }
                                ]
                            }]));
                            $('.alert').hide().fadeIn(500);
                        }
                    });
                }
            }
        });
        //$(document).on('submit', '#frm-login', function (e) {
        //    var self = $(this);
        //    e.preventDefault();
        //
        //});
    };

    var bindSocket = function (client) {
        client.on('loginRespone', function (data) {
            console.log('loginRespone', data);
        });
    }

    function _signInHandler(data, statusText, xhr) {
        
        if (xhr && xhr.status === 202) {
            window._finesse.getUserDetail(getCookie('_agentId'), function (data, statusText, xhr) {
                //debugger
                if (xhr.status === 200 || xhr.status === 202) {
                    let user = JSON.parse(xml2json(xhr.responseText)).User;
                    setCookie("_agentState", user.state);
                    // Nếu là agent mobile thì không cần check login jabber
                    if (getCookie('_isLoginMobile') == '1'){
                        return  window.location.reload();
                    }
                    // Check jabber phải được connect 
                    console.log("checj japasss", user)
                    if (user.state === 'LOGOUT') {
                        isLoging = false;
                        onClientError();
                    } else {
                        if (window.location.pathname != '/login') {
                            window.location.reload();
                        } else {
                            window.location.href = '/';
                        }
                    }
                }
            }, function () { 
                onClientError(); });
        } else {
            onClientError();
        }
    }


    function _changeAgentStateHandler(data, statusText, xhr) {
        if (xhr.status === 202) {
            setCookie("_agentState", "NOT_READY")
            if (window.location.pathname != '/login') {
                window.location.reload();
            } else {
                window.location.href = '/';
            }
        }
    }

    function _signOutHandler(data, statusText, xhr) {
        console.log("ket no api ", xhr.status)
        if (xhr.status === 202) {
            _finesse.signIn(getCookie('_agentId'), getCookie('_extension'),getCookie('_isLoginMobile'), getCookie('_extensionMobile'), getCookie('_dialNumber'),  null, _signInHandler, function () {
                console.log('vao day3333 ')
                onClientError();
            });
        } else {
            console.log('vao day2222 ')
            onClientError();
        }
    }

    function onClientError() {
        console.log('LOGOUT error jabber');
        jQuery.ajax({ url: '/logout' });
        $('.alert').remove();
        $('#l-login').prepend(_.Tags([{
            tag: 'div',
            attr: { class: 'alert alert-danger alert-dismissible', role: 'alert' },
            content: "Hệ thống không kết nối được jabber.",
            childs: [
                { tag: 'button', attr: { class: 'close', type: 'button', "data-dismiss": "alert", " aria-label": "Close" }, childs: [{ tag: 'span', attr: { "aria-hidden": true }, content: 'x' }] }
            ]
        }]));
        $('.alert').hide().fadeIn(500);
    }

    function _eventHandler(data) {
        console.log("EVENT", data);
    }

    return {
        init: function () {
            if (!$('.login-content')[0]) {
                scrollbar('html', 'rgba(0,0,0,0.3)', '5px');
            }
            $('#frm-login #name').val(getCookie('username'));
            $('#frm-login #password').val(getCookie('password'));
            bindClick();
            bindSubmit();
        },
        uncut: function () {
            //$('#frm-login').validationEngine('detach');
        }
    };
}(jQuery);