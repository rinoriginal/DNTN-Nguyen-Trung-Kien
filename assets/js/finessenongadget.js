var Finesse = function (username, password) {
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

    var
        _resource,
        _credentials = jabberwerx.util.crypto.b64Encode(username + ":" + password),
        _webappPath = window._urlBinding + "/finesse",
        _outboundCampaignAPI = window._urlBinding,
        _createSetHeader = function (headers) {
            return function (xhr) {
                var header;
                if (headers) {
                    for (header in headers) {
                        if (headers.hasOwnProperty(header)) {
                            xhr.setRequestHeader(header, headers[header]);
                        }
                    }
                }
            };
        }
    _createSuccessHandler = function (handler) {
        return function (data, statusText, xhr) {
            if (handler) {
                handler(data, statusText, xhr);
            }
        };
    },
        _createErrorHandler = function (errHandler) {
            return function (xhr, statusText, err) {
                if (errHandler) {
                    errHandler(xhr.status);
                }
            };
        },

        /**
         * Constructs and sends a request API (using jQuery). Since this sample JS
         * and page is hosted outside of the Finesse Web Services server, making an
         * Ajax request to that server will violate the same-origin policy. A common
         * solution is to setup a HTTP proxy which will forward request to the
         * Web Services server.
         *
         * @param {String} url
         *      Where to send the request to.
         * @param {String} method
         *    "GET", "POST", "PUT"
         * @param {Map} headers
         *      Object containing key/value header params.
         * @param {Map} params
         *      Object containing key/value params.
         * @param {Function(Object)} handler
         *      Callback to handle response.
         * @param {Function(Object)} errHandler
         *      Callback to handle error with request.
         * @param {Boolean} cache
         *      True if request should cache, false otherwise.
         * @param {String} xml
         *      The xml to pass to the request  
         * @private
         */
        _sendReq = function (url, method, headers, params, handler, errHandler, cache, xml) {
            var newUrl = url,
                delim = "?",
                param,
                p = p || {},
                xhrArgs;

            //Add BASIC credentials to be sent with each requests. The JSESSIONID
            //token should automatically be handled by the browser.
            if (_credentials) {
                headers = headers || {};
                headers.Authorization = "Basic " + _credentials;
            }
            xmlData = xml;

            //Request arguments.
            contentType = "application/xml";

            if (method === "GET") {
                xhrArgs = {
                    url: newUrl,
                    type: method,
                    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    // added processData: false to not send data on url
                    processData: false,
                    beforeSend: _createSetHeader(headers),
                    success: _createSuccessHandler(handler),
                    error: _createErrorHandler(errHandler),
                    cache: cache
                }
            } else {
                xhrArgs = {
                    url: newUrl,
                    type: method,
                    contentType: contentType,
                    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    data: xmlData,
                    // added processData: false to not send data on url
                    processData: false,
                    beforeSend: _createSetHeader(headers),
                    success: _createSuccessHandler(handler),
                    error: _createErrorHandler(errHandler),
                    cache: cache
                }
            };

            //Uses jQuery to send Ajax request to backend.
            jQuery.ajax(xhrArgs);
        };




    /**********************************************************************
     * CONNECTION APIs
     *********************************************************************/

    /**
     * Sign in the user.
     *
     * @param {String} extension
     *      Agent's extension.
     * @param {Boolean} forcedFlag
     *      Set true to force the sign in.
     * @param {Function(Object)} handler
     *      Callback to handle response.
     * @param {Function(Object)} errHandler
     *      Callback to handle error response.
     * @memberOf cisco.desktop.services.Transporter#
     */


    this.sysInfo = function (handler, errHandler) {
        var method = "GET",
            params = ""
        url = _webappPath + "/api/SystemInfo";
        _sendReq(url, method, null, null, handler, errHandler, null, null, "");
    };

    this.signIn = function (agentid, extension, isLoginMobile, extensionMobile, dialNumber, forcedFlag, handler, errHandler) {
        console.log('login mobile11111', isLoginMobile)
        if (agentid && extension) {
            var method = "PUT",
                cache = "",
                url = _webappPath + "/api/User/" + agentid;
            var xmlData = ""
            if (isLoginMobile == '1') {
                xmlData = '<User>' +
                    '<state>LOGIN</state>' +
                    '<extension>' + extensionMobile + '</extension>' +
                    '<mobileAgent>' +
                    '<mode>CALL_BY_CALL</mode>' +
                    '<dialNumber>' + dialNumber + ' </dialNumber>' +
                    '</mobileAgent>' +
                    '</User>';
            } else {
                xmlData = "<User><state>LOGIN</state><extension>" + extension + "</extension></User>";
            }


            _sendReq(url, method, null, null, handler, errHandler, null, xmlData);
        }

    };

    /**
     * Sign out the user.
     *
     * @param {String} extension
     *      Agent's extension.
     * @param {Number} reasonCode
     *      Reason code for logging out, or null.
     * @param {Function(Object)} handler
     *      Callback to handle response.
     * @param {Function(Object)} errHandler
     *      Callback to handle error response.
     * @memberOf cisco.desktop.services.Transporter#
     */
    this.signOut = function (agentid, extension, reasonCode, handler, errHandler) {
        var method = "PUT",
            url = _webappPath + "/api/User/" + agentid;
        xmlData = "<User><state>LOGOUT</state></User>";
        _sendReq(url, method, null, null, handler, errHandler, null, xmlData);
    };


    /**********************************************************************
     * AGENT APIs
     *********************************************************************/

    /**
     * Gets the specified agent's state.
     *
     * @param {String} agentId
     *      Agent's username or ID.
     * @param {Function(Object)} handler
     *      Callback to handle response.
     * @param {Function(Object)} errHandler
     *      Callback to handle error response.
     * @memberOf cisco.desktop.services.Transporter#
     */
    this.getState = function (agentId, handler, errHandler) {
        var method = "GET",
            url = _webappPath + "/api/User/" + agentId;
        // no xmlData on a GET
        _sendReq(url, method, null, null, handler, errHandler, null, null);
    };

    /**
     * Changes the agent's state
     *
     * @param {String} agentId
     *      Agent's username or ID
     * @param {String} state
     *      State to change to
     *      (E = applies to UCCE, X = applies to UCCX)
     *      EX           1 - Logout
     *      EX           2 - Not Ready
     *      EX           3 - Ready
     *      EX           4 - Talking
     *      EX           5 - Work Not Ready
     *      E            6 - Work Ready
     *      E            7 - Busy Other
     *      EX           8 - Reserved
     *      E            9 - Unknown
     *      E           10 - Hold
     *      E           11 - Active
     *      E           12 - Paused
     *      E           13 - Interrupted
     *      E           14 - Not Active
     * @param {Number} reasonCode Reason code for the state change (only
     * applies to Not Ready and Logout state changes), or null.
     * @param {Function(Object)} handler Callback to handle response.
     * @param {Function(Object)} errHandler Callback to handle error response.
     * @memberOf cisco.desktop.services.Transporter#
     */
    this.changeState = function (agentId, state, reasonCode, handler, errHandler) {
        let method = "PUT";
        let url = _webappPath + "/api/User/" + agentId;
        let xmlData = ""
        console.log('tttt', reasonCode)
        if (reasonCode) {
            xmlData = "<User><state>" + state + "</state><reasonCodeId>" + reasonCode + "</reasonCodeId></User>";
        } else {
            xmlData = "<User><state>" + state + "</state></User>";
        }

        //_sendReq(url, method, null, null, handler, errHandler, xmlData);
        _sendReq(url, method, null, null, handler, errHandler, null, xmlData);
    };

    /**
     *  NOT USED
     * Subscribes to Agent state events.
     *
     * @param {String} agentId
     *      The Agent's username or Id.
     * @param {Function(Object)} rspHandler
     *      Callback to handle response.
     * @param {Function(Object)} errHandler
     *      Callback when error making the request.
     * @memberOf cisco.desktop.services.Transporter#
     */
    this.subscribeToState = function (agentId, resource, handler, errHandler) {
        var method = "POST",
            url = _webappPath + "/api/User/" + agentId,
            params = { "resource": _resource };
        _sendReq(url, method, null, params, handler, errHandler);
    };




    /**********************************************************************
     * CALL CONTROL APIs
     *********************************************************************/

    /**
     * Make a call.
     *
     * @param {Function(Object)} handler
     *      Callback to handle response.
     * @param {Function(Number)} errHandler
     *      Callback when error making the request.
     * @memberOf cisco.desktop.services.Transporter#
     */
    this.makeCall = function (dialedNumber, callerNumber, handler, errHandler) {
        var method = "POST",
            url = _webappPath + "/api/User/" + callerNumber + "/Dialogs",
            params = {
                "requestedAction": "MAKE_CALL",
                "toAddress": dialedNumber,
                "fromAddress": callerNumber
            },
            xml = "<Dialog><requestedAction>MAKE_CALL</requestedAction><toAddress>" + dialedNumber + "</toAddress><fromAddress>" + callerNumber + "</fromAddress></Dialog>";
        _sendReq(url, method, null, params, handler, errHandler, false, xml);
    };

    /**
     * Answers the call for the specified call ID.
     *
     * @param {String} callId
     *      The ID of the call.
     * @param {Function(Object)} handler
     *      Callback to handle response.
     * @param {Function(Number)} errHandler
     *      Callback when error making the request.
     * @memberOf cisco.desktop.services.Transporter#
     */
    this.answerCall = function (callId, myExtension, handler, errHandler) {
        var method = "PUT",
            url = _webappPath + "/api/Dialog/" + callId,
            xml = "<Dialog><targetMediaAddress>" + myExtension + "</targetMediaAddress><requestedAction>ANSWER</requestedAction></Dialog>";
        _sendReq(url, method, null, null, handler, errHandler, false, xml);
    };

    /**
     * Holds the call for the specified call ID.
     *
     * @param {String} callId
     *      The ID of the call.
     * @param {Function(Object)} handler
     *      Callback to handle response.
     * @param {Function(Number)} errHandler
     *      Callback when error making the request.
     * @memberOf cisco.desktop.services.Transporter#
     */
    this.holdCall = function (callId, myExtension, handler, errHandler) {
        var method = "PUT",
            url = _webappPath + "/api/Dialog/" + callId,
            xml = "<Dialog><targetMediaAddress>" + myExtension + "</targetMediaAddress><requestedAction>HOLD</requestedAction></Dialog>";
        _sendReq(url, method, null, null, handler, errHandler, false, xml);
    };

    /**
     * Retrieve the call for the specified call ID.
     *
     * @param {String} callId
     *      The ID of the call.
     * @param {Function(Object)} handler
     *      Callback to handle response.
     * @param {Function(Number)} errHandler
     *      Callback when error making the request.
     * @memberOf cisco.desktop.services.Transporter#
     */
    this.retrieveCall = function (callId, myExtension, handler, errHandler) {
        var method = "PUT",
            url = _webappPath + "/api/Dialog/" + callId,
            xml = "<Dialog><targetMediaAddress>" + myExtension + "</targetMediaAddress><requestedAction>RETRIEVE</requestedAction></Dialog>";
        _sendReq(url, method, null, null, handler, errHandler, false, xml);
    };
    /**
     * Retrieve the call for the specified call ID.
     *
     * @param {String} callId
     *      The ID of the call.
     * @param {Function(Object)} handler
     *      Callback to handle response.
     * @param {Function(Number)} errHandler
     *      Callback when error making the request.
     * @memberOf cisco.desktop.services.Transporter#
     */
    this.keypad = function (callId, myExtension, key, handler, errHandler) {
        var method = "PUT",
            url = _webappPath + "/api/Dialog/" + callId,
            // xml = "<Dialog><targetMediaAddress>" + myExtension + "</targetMediaAddress><requestedAction>RETRIEVE</requestedAction></Dialog>";
            xml = "<Dialog><targetMediaAddress>" + myExtension + "</targetMediaAddress><requestedAction>SEND_DTMF</requestedAction><actionParams><ActionParam><name>dtmfString</name><value>" + key + "</value></ActionParam></actionParams></Dialog>"
        _sendReq(url, method, null, null, handler, errHandler, false, xml);
    };
    /**
     * Wrap up the call for the specified call ID.
     *
     * @param {String} callId
     *      The ID of the call.
     * @param {Function(Object)} handler
     *      Callback to handle response.
     * @param {Function(Number)} errHandler
     *      Callback when error making the request.
     * @memberOf cisco.desktop.services.Transporter#
     */
    this.wrapUp = function (callId, label, handler, errHandler) {
        var method = "PUT",
            url = _webappPath + "/api/Dialog/" + callId,
            xml = "<Dialog><mediaProperties><wrapUpReason>"+label+"</wrapUpReason></mediaProperties><requestedAction>UPDATE_CALL_DATA</requestedAction></Dialog>"
        _sendReq(url, method, null, null, handler, errHandler, false, xml);
    };

    /**
     * Hangs up the call for the specified call ID.
     *
     * @param {String} callId
     *      The ID of the call.
     * @param {String} releasingDeviceId
     *      The ID of the releasing device.
     * @param {Function(Object)} handler
     *      Callback to handle response.
     * @param {Function(Number)} errHandler
     *      Callback when error making the request.
     * @memberOf cisco.desktop.services.Transporter#
     */
    this.dropCall = function (callId, connectionDeviceID, handler, errHandler) {
        console.log('callId', callId);
        console.log('connectionDeviceID', connectionDeviceID);
        var method = "PUT",
            url = _webappPath + "/api/Dialog/" + callId,
            xml = "<Dialog><targetMediaAddress>" + connectionDeviceID + "</targetMediaAddress><requestedAction>DROP</requestedAction></Dialog>";
        _sendReq(url, method, null, null, handler, errHandler, false, xml);
    };

    /**
     * Sets the resource ID to be sent whenever subscriptions are made. Must be
     * invoked with a valid resource ID for subscription requests to trigger
     * events to be sent by the Notification Service.
     */
    this.setResource = function (resource) {
        _resource = resource;
    };

    this.getUsers = function (handler, errHandler) {
        var method = "GET",
            url = _webappPath + "/api/Users";
        _sendReq(url, method, null, null, handler, errHandler, null, null);
    }

    this.getUserDetail = function (agentId, handler, errHandler) {
        var method = 'GET';
        var url = _webappPath + '/api/User/' + agentId;
        _sendReq(url, method, null, null, handler, errHandler, null, null);
    }

    this.getDialogs = function (agentid, handler, errHandler) {
        var method = "GET",
            url = _webappPath + "/api/User/" + agentid + "/Dialogs";
        _sendReq(url, method, null, null, handler, errHandler, null, null);
    }


    this.getDialog = function (dialogId, handler, errHandler) {
        var method = "GET",
            url = _webappPath + "/api/Dialog/" + dialogId;
        _sendReq(url, method, null, null, handler, errHandler, null, null);
    }
    this.getWrapUp = function (agentid, handler, errHandler) {
        var method = "GET",
            url = _webappPath + "/api/User/"+ agentid +"/WrapUpReasons"
        _sendReq(url, method, null, null, handler, errHandler, null, null);
    }

    this.getTeam = function (teamId, handler, errHandler) {
        var method = "GET",
            url = _webappPath + "/api/Team/" + teamId + "?includeLoggedOutAgents=true";
        _sendReq(url, method, null, null, handler, errHandler, null, null);
    }

    this.silentMonitor = function (manageId, fromAddress, toAddress, handler, errHandler) {
        var method = "POST",
            url = _webappPath + "/api/User/" + manageId + "/Dialogs",
            xml = '<Dialog>' +
                '<requestedAction>SILENT_MONITOR</requestedAction>' +
                '<fromAddress>' + fromAddress + '</fromAddress>' +
                '<toAddress>' + toAddress + '</toAddress>' +
                '</Dialog>';
        _sendReq(url, method, null, null, handler, errHandler, null, xml);
    }
    this.makeBargeCall = function (manageId, fromAddress, toAddress, idDialog, handler, errHandler) {
        var method = "POST",
            url = _webappPath + "/api/User/" + manageId + "/Dialogs",
            xml = '<Dialog>' +
                '<requestedAction>BARGE_CALL</requestedAction>' +
                '<fromAddress>' + fromAddress + '</fromAddress>' +
                '<toAddress>' + toAddress + '</toAddress>' +
                '<associatedDialogUri>' + '/finesse/api/Dialog/' + idDialog + '</associatedDialogUri>' +
                '</Dialog>';
        _sendReq(url, method, null, null, handler, errHandler, null, xml);
    }
    this.makeTransferCall = function (fromAddress, toAddress, idDialog, handler, errHandler) {
        var method = "PUT",
            url = _webappPath + "/api/Dialog/" + idDialog,
            xml = '<Dialog>' +
                '<requestedAction>TRANSFER_SST</requestedAction>' +
                '<toAddress>' + toAddress + '</toAddress>' +
                '<targetMediaAddress>' + fromAddress + '</targetMediaAddress>' +
                '</Dialog>';
        _sendReq(url, method, null, null, handler, errHandler, null, xml);
    }

    this.createOutboundCampaign = function (handler, errHandler) {
        var method = "POST",
            url = _outboundCampaignAPI + "/unifiedconfig/config/campaign",
            xml = '';
        _sendReq(url, method, null, null, handler, errHandler, false, xml);
    }
    this.getOutboundCampaigns = function (handler, errHandler) {
        var method = "GET",
            url = _outboundCampaignAPI + "/unifiedconfig/config/campaign";
        _sendReq(url, method, null, null, handler, errHandler, null, null);
    }

    this.serCallVariables = function (dialogId, vars, handler, errHandler) {
        if (dialogId === undefined || !vars || typeof (vars) !== 'object' || vars.length === undefined || vars.length === 0) {
            return;
        }

        var method = "PUT";
        var url = _webappPath + '/api/Dialog/' + dialogId;
        var xml =
            '<Dialog>' +
            '<requestedAction>UPDATE_CALL_DATA</requestedAction>' +
            '<mediaProperties>' +
            '<callvariables>';
        for (i = 0; i < vars.length; i++) {
            if (vars[i] === null || vars[i] === undefined || vars[i] === '') {
                continue;
            }
            xml +=
                '<CallVariable>' +
                '<name>callVariable' + (i + 3) + '</name>' +
                '<value>' + vars[i] + '</value>' +
                '</CallVariable>';
        }
        xml += '</callvariables>' +
            '</mediaProperties>' +
            '</Dialog>';
        _sendReq(url, method, null, null, handler, errHandler, null, xml);
    }
    this.getReasonCodeListByUser = function (agentId, handler, errHandler) {
        var url = _webappPath + '/api/User/' + agentId + '/ReasonCodes?category=NOT_READY';
        var method = "GET";
        _sendReq(url, method, null, null, handler, errHandler, null, xml = null);
    }
};