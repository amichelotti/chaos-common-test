/**
 *  !CHAOS REST Library                                                                                                                                                                                           
 *@fileOverview                                                                                                                                                                               
 *@version 1.0                                                                                                                                                                                
 *@author Andrea Michelotti
 *@module jchaos
 */

/**
 * Callback in asynchronous operations called when the operation is ok
 * @callback okcb
 * @param {object} data  depend on the operation (typically a dataset)
 */

/** 
 * Callback in asynchronous operations called when the operation is fails
 * @callback badcb
 * @param {string|object} data description of the error
 */
/**
 * The command object for sendCU commands
 * @typedef {Object} cmdPar
 * @property {string} cmd - command name
 * @property {integer} prio - Priority
 * @property {integer} mode - mode
 */

/**
 * CU variable path
 * @typedef {Object} varpath
 * @property {string} cu CU PATH 
 * @property {string} dir direction (input,output)
 * @property {string} var variable dataset name
 * @property {string} const constantco:String
 * @property {string} origin full path
 */
/**
 * Channel idintification mapping:
 * -1 : all
 *  0: output
 *  1: input
 *  2: custom
 *  3: system
 *  4: health
 *  5: cu alarms
 *  6: device alarms
 *  128: status
 *  255: health+system+ alarams
 * @typedef {integer} channelid
 */
/**
 * @typedef ChaosOption
 * @type {object}
 * @property {boolean} updateEachCall history update each call
 * @property {string} uri address:port of the REST server
 */
(function() {
    /**
     * Creates a new jchaos object.
     * @class
     */
    function createLibrary() {

        var jchaos = {};
        jchaos['latency'] = 0;
        jchaos['latency_avg'] = 0;
        jchaos['latency_tot'] = 0;
        jchaos['errors'] = 0;
        jchaos['timeouts'] = 0;
        jchaos['nops'] = 0;

        jchaos['numok'] = 0;
        jchaos.extendJson = function(key, n) {
            // Filtraggio delle proprietà
            if (Number(n) === n && n % 1 !== 0) {
                var obj = { $numberDouble: n.toString() };
                return obj;
            }

            return n;
        }
        jchaos.extendStringKey = function(obj, key) {
            if (obj.hasOwnProperty(key)) {
                try {
                    var o = JSON.parse(obj[key]);
                    obj[key] = JSON.stringify(o, jchaos.extendJson);

                } catch (e) {

                }
                return obj;
            }
            // Filtraggio delle proprietà
            if (Number(n) === n && n % 1 !== 0) {
                var obj = { $numberDouble: n.toString() };
                return obj;
            }

            return n;
        }
        jchaos.ops_on_going = 0;
        jchaos.ops_abort = false;
        jchaos.lastChannel = {};
        var uri_default = "localhost:8081";
        /** 
         * @prop {boolean} updateEachCall=true choose if update each call of history operation
         * @prop {string} uri=localhost:8081 REST server URI
         * @prop {boolean} async=true if false force the call to be synchronous, otherwise depend if the callback is definedd
         * @prop {integer} limit_on_going=10000 limits the concurrent operations
         * @prop {integer} history_page_len=1000 default history page len
         * @prop {integer} timeout=5000 default timeout for operation
         * @prop {callback} console_log redirected on console.log
         * @prop {callback} console_err redirected on console.error

        */
        jchaos.options = {
            updateEachCall: false,
            uri: uri_default,
            async: true,
            limit_on_going: 10000,
            history_page_len: 1000,
            timeout: 5000,
            console_log: function(str) { console.log(str); },
            console_err: function(str) { console.error(str); }

        };


        /**
         * Decode a CU dataset element path and return an object
         * @param  {string} cupath
         * @function decodeCUPath
         * @return {varpath}
         */
        jchaos.decodeCUPath = function(cupath) {
            var regex_vect = /(.*)\/(.*)\/(.*)\[([-\d]+)\]$/;

            var regex = /(.*)\/(.*)\/(.*)$/;
            var tmp = {
                cu: null,
                dir: null,
                var: null,
                const: null,
                origin: cupath
            };
            if ($.isNumeric(cupath)) {
                tmp = {
                    cu: null,
                    dir: null,
                    var: null,
                    const: Number(cupath),
                    index: null, // in case of vectors
                    origin: cupath
                };
                return tmp;
            }
            var match = regex_vect.exec(cupath);
            if (match != null) {
                tmp = {
                    cu: match[1],
                    dir: match[2],
                    var: match[3],
                    const: null,
                    index: match[4],
                    origin: cupath
                };
                return tmp;
            }
            match = regex.exec(cupath);
            if (match != null) {
                tmp = {
                    cu: match[1],
                    dir: match[2],
                    var: match[3],
                    const: null,
                    index: null,
                    origin: cupath
                };
            }
            return tmp;
        }


        jchaos.isCollapsable = function(arg) {
                return arg instanceof Object && Object.keys(arg).length > 0;
            }
            /**
             * translate seconds in days hours minutes seconds string
             * @function toHHMMSS
             * @param  {integer} sec_num
             * @return {string} return string xx days hh:mm:ss 
             */
        jchaos.toHHMMSS = function(sec_num) {

                // var sec_num = parseInt(this, 10); // don't forget the second param	
                var days = Math.floor(sec_num / 86400);
                var hours = Math.floor((sec_num - (days * 86400)) / 3600);
                var minutes = Math.floor((sec_num - (days * 86400) - (hours * 3600)) / 60);
                var seconds = sec_num - (days * 86400) - (hours * 3600) - (minutes * 60);

                if (days < 10) {
                    days = "0" + days;
                }
                if (hours < 10) {
                    hours = "0" + hours;
                }
                if (minutes < 10) {
                    minutes = "0" + minutes;
                }
                if (seconds < 10) {
                    seconds = "0" + seconds;
                }

                return days + ' days ' + hours + ':' + minutes + ':' + seconds;
            }
            /***
             * @hide
             */
        jchaos.createMotor = function(name, endOphandler, switchHandler) {

            var obj = {
                name: name,
                lastpos: 0,
                limit1: false,
                limit2: false,
                home: false,

                // move absolute
                mov: function(pos) {

                },
                // move relative
                movr: function(pos) {

                },
                // do home
                gohome: function() {

                },
                pos: function() {

                }
            }
            return obj;
        }



        /**
         * Set Library options options
         * @param  {object} opt
         * @function setOption
         */
        jchaos.setOptions = function(opt) {

            for (var attrname in opt) { jchaos.options[attrname] = opt[attrname]; }
            var str = jchaos.options['uri'];
            //	var regex = /\:\d+/;
            //strip eventual port
            jchaos.options['uri'] = str;



        }

        /** 
         * Prints a String on the configured console
         * @param  {string} str
         */
        jchaos.print = function(str) {
                jchaos.options['console_log'](str);
            }
            /** 
             * Prints a String on the configured console error
             * @param  {string} str
             */
        jchaos.perror = function(str) {
                jchaos.options['console_err'](str);
            }
            /******* REMOTE PROCESS MANAGEMENT ****/
            /**
             * Helper function to post commands on the process remote management
             * @param  {string} server rest process remote management server
             * @param  {string} func REST function
             * @param  {object} param REST function parameters
             * @param  {okcb} handler handler on success
             * @param  {badcb} badhandler handler on failure
             * @function basicRmt
             */
        jchaos.basicRmt = function(server, func, param, handler, badhandler) {
            if (handler instanceof Function) {
                jchaos.basicPost("api/v1/restconsole/" + func, JSON.stringify(param), function(r) {
                    if (handler instanceof Function) {
                        handler(r);
                    } else {
                        return r;
                    }
                }, badhandler, server);
            } else {
                return jchaos.basicPost("api/v1/restconsole/" + func, JSON.stringify(param), null, null, server);

            }
        }

        /**
         * Retrive a given environemnt variable
         * @param  {string} server rest process remote management server
         * @param  {string} varname environment variable name
         * @param  {okcb} handler handler on success
         * @param  {badcb} badhandler handler on failure
         * @returns the value on the specified handler.
         * @function rmtGetEnvironment

         */
        jchaos.rmtGetEnvironment = function(server, varname, handler, badhandler) {
                var param = {};
                param['variable'] = varname;
                return jchaos.basicRmt(server, "getenv", param, handler, badhandler);
            }
            /**
             * Set the specified propery
             * @param  {string} server rest process remote management server
             * @param  { {uid:String, propname:String} } prop property name 
             * @param  {okcb} handler handler on success
             * @param  {badcb} badhandler handler on failure
             * @returns the value on the specified handler.
             * @function rmtSetProp
             */
        jchaos.rmtSetProp = function(server, prop, handler, badhandler) {
                return jchaos.basicRmt(server, "setprop", prop, handler, badhandler);
            }
            /**
             * 
             */
            /**
             * Launch a process the specified process on the given remote server
             * return a process structure
             * @param  {string} server rest process remote management server
             * @param  {string} name program name
             * @param  {string} cmdline command line
             * @param  {string} ptype type ("exec": binary, "C++": C++ script")
             * @param  {string} workdir remote local directory
             * @param  {okcb} handler handler on success
             * @param {badcb} badhandler handler on failure
             * @returns {object} return a process object with many status and information
             * @function rmtCreateProcess
             */
        jchaos.rmtCreateProcess = function(server, name, cmdline, ptype, workdir, handler, badhandler) {
                var param = {};
                param['cmdline'] = cmdline;
                param['ptype'] = ptype;
                param['pname'] = name;
                if (workdir != null && workdir != "") {
                    param['workdir'] = workdir;
                }
                console.log("create process:" + JSON.stringify(param));
                return jchaos.basicRmt(server, "create", param, handler, badhandler);
            }
            /**
             * Retrive a process working directory 
             * return a zip file
             */
            /**
             * Return a zip file contaning the working directory of the specified process
             * can be used to retrieve outputs of remote runs
             * @param  {string} server rest process remote management server
             * @param  {string} uid the process uid returned by the rmtCreateProcess
             * @param  {string} workdir working dir to retrieve and zip
             * @param  {okcb} handler handler on success
             * @param {badcb} badhandler handler on failure
             * @function rmtCreateProcess
             */
        jchaos.rmtDownload = function(server, uid, workdir, handler, badhandler) {
                var param = {};
                param['uid'] = uid;
                if (workdir != null && workdir != "") {
                    param['workdir'] = workdir;
                }

                console.log("Download process outputs:" + JSON.stringify(param));
                return jchaos.basicRmt(server, "download", param, handler, badhandler);
            }
            /**
             */
            /**
             * Upload a script/executable on the remote server 
             * return the path 
             * @param  {string} server rest process remote management server
             * @param  {string} name program name
             * @param  {string} ptype type ("exec": binary, "C++": C++ script")
             * @param  {string} content base64 encoded content to upload
             * @returns {object} return the path of the remote process
             * @param  {okcb} handler handler on success
             * @param {badcb} badhandler handler on failure
             * @function rmtUploadScript
             */
        jchaos.rmtUploadScript = function(server, name, ptype, content, handler, badhandler) {

                if ((name instanceof Object) && (ptype instanceof Function) && (content instanceof Function)) {
                    return jchaos.basicRmt(server, "load", name, ptype, content);
                }
                var param = {};
                param['script_name'] = name;
                param['eudk_script_language'] = ptype;
                param['eudk_script_content'] = btoa(unescape(encodeURIComponent(content)));
                return jchaos.basicRmt(server, "load", param, handler, badhandler);

            }
            /**
             * Return a list of process on the given server
             * @param  {string} server rest process remote management server
             * @param  {okcb} handler handler on success
             * @param {badcb} badhandler handler on failure
             * @returns {object[]} return a list of process descriptors
             * @function rmtListProcess
             */
        jchaos.rmtListProcess = function(server, handler, badhandler) {
            var param = {};
            return jchaos.basicRmt(server, "list", param, handler, badhandler);

        }

        /**
         * Write on the remote console of the specified process
         * @param  {string} server rest process remote management server
         * @param  {string} uid the process uid returned by the rmtCreateProcess
         * @param  {string} str line to send
         * @param  {okcb} handler handler on success
         * @param {badcb} badhandler handler on failure
         * @dfunction rmtSetConsole
         */
        jchaos.rmtSetConsole = function(server, uid, str, handler, badhandler) {
                var param = {};
                param['uid'] = uid;
                param['data'] = btoa(unescape(encodeURIComponent(str + "\n")));
                return jchaos.basicRmt(server, "setconsole", param, handler, badhandler);
            }
            /**
             * Reads the console of the specified process uid
             * @param  {string} server rest process remote management server
             * @param  {string} uid the process uid returned by the rmtCreateProcess
             * @param  {integer} fromline get from this line
             * @param  {integer} toline until this line (-1 means end)
             * @param  {okcb} handler handler on success
             * @param {badcb} badhandler handler on failure
             * @dfunction rmtGetConsole
             */
        jchaos.rmtGetConsole = function(server, uid, fromline, toline, handler, badhandler) {
            var param = {};
            param['uid'] = uid;
            param['fromline'] = fromline;
            param['toline'] = toline;

            return jchaos.basicRmt(server, "getconsole", param, handler, badhandler);
        }


        /**
         * Kill the specified process
         * @param  {string} server rest process remote management server
         * @param  {string} uid the process uid returned by the rmtCreateProcess
         * @param  {okcb} handler handler on success
         * @param {badcb} badhandler handler on failure
         * @function rmtKill
         */
        jchaos.rmtKill = function(server, uid, handler, badhandler) {
            var param = {};
            param['uid'] = uid;

            return jchaos.basicRmt(server, "kill", param, handler, badhandler);
        }


        /**
         * Purge a list of process to a given level (0 soft (EXCEPTION), 1 medium (ENDED and EXCEPTION), 2 hard (ALL) 
         * @param  {string} server rest process remote management server
         * @param  {integer} level purge level
         * @param  {okcb} [handler] handler on success
         * @param {badcb} [badhandler] handler on failure
         * @function rmtPurge
         */
        jchaos.rmtPurge = function(server, level, handler, badhandler) {
            var param = {};
            param['level'] = level;

            return jchaos.basicRmt(server, "purge", param, handler, badhandler);
        }


        /******************************/
        /****** WIDGET */
        /**
         * @hide
         */
        jchaos.progressBar = function(msg, id, lab) {
                var progressbar;
                var instant = $('<div></div>').html('<div id="' + id + '"><div class="progress-label">' + lab + '</div></div>').dialog({

                    title: msg,
                    position: "top",
                    open: function() {
                        progressbar = $("#" + id)
                        var progressLabel = $(".progress-label");
                        progressbar.progressbar({
                            value: false,
                            change: function() {
                                var val = progressbar.progressbar("value");
                                progressLabel.text(val + "%");
                            },
                            complete: function() {
                                $(this).parent().dialog("close");
                            }
                        });
                    },
                    close: function() {
                        $(this).remove();
                    }
                });
            }
            /***** */

        /**
         * Helper function that is the base of all commands to the !CHAOS REST SERVER
         * the server is specified in the option
         * @param  {string} func  REST function to perform
         * @param  {string} params parameters
         * @param  {okcb} [handler] handler on success, if present the call will be asynchronous
         * @param {badcb} [badhandler] handler on failure
         * @param  {string} [server] override the default server
         * @function basicPost
         */
        jchaos.basicPost = function(func, params, handleFunc, handleFuncErr, server) {
                var request;
                var now = (new Date()).getTime();

                if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
                    XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
                }
                request = new XMLHttpRequest();

                var srv = jchaos.options.uri;
                XMLHttpRequest.responseType = "json";
                if (typeof server === "string") {
                    srv = server;
                }
                var url = "http://" + srv + "/" + func;
                var could_make_async = (typeof handleFunc === "function");
                if (could_make_async == false) {
                    request.open("POST", url, false);
                    // request.timeout = jchaos.options.timeout; //not possiblee for sync

                    request.send(params);
                    if (request.status == 200) {
                        try {
                            var json = JSON.parse(request.responseText);
                            return json;
                        } catch (err) {
                            var str = "jchaos.basicPost Error parsing json '" + err + "' body returned:'" + request.responseText + "' post:'" + params + "'";
                            console.error(str);
                            throw str;
                            return null;
                        }
                    }
                    console.error("bad status:" + request.status + " error:" + request.responseText);

                    return null;

                }
                request.open("POST", url, (jchaos.ops_on_going > jchaos.options.limit_on_going) ? false : (jchaos.options.async));
                request.timeout = jchaos.options.timeout;
                jchaos['nops']++;

                // console.log("on going:"+jchaos.ops_on_going);
                // request.setRequestHeader("Content-Type", 'application/json');
                jchaos.ops_on_going++;
                request.onreadystatechange = function(e) {

                    //console.log("answer:"+request.status + " state:"+request.readyState);
                    if (request.readyState == 4) {
                        jchaos.ops_on_going--;
                        if (request.status == 200) {
                            try {
                                var json = JSON.parse(request.responseText);
                                if (could_make_async) {
                                    try {
                                        var lat = (new Date()).getTime() - now;
                                        jchaos['latency'] = lat;
                                        jchaos['latency_tot'] += lat;
                                        jchaos['numok'] = jchaos['numok'] + 1;
                                        jchaos['latency_avg'] = jchaos['latency_tot'] / jchaos['numok'];
                                        handleFunc(json);
                                    } catch (err) {
                                        console.trace("trace:");
                                        var str = "handler function error:'" + err + "' url:'" + url + "' post data:'" + params + "' response:'" + request.responseText + "'";
                                        jchaos.perror(str);
                                        if (typeof handleFuncErr === "function") {
                                            handleFuncErr(json);
                                        }
                                    }
                                }
                                return json;

                            } catch (err) {
                                var str = "jchaos.basicPost Error parsing json '" + err + "' body returned:'" + request.responseText + "'" + "' post:'" + params + "'";;


                                //console.error(str);
                                jchaos.perror(str);
                                //throw str;
                                if ((typeof handleFuncErr === "function")) {
                                    handleFuncErr(request.responseText);
                                } else {
                                    if (could_make_async) {
                                        handleFunc(request.responseText);
                                    } else {
                                        return request.responseText;
                                    }
                                }

                            }
                        } else {
                            var json;
                            var str;
                            jchaos['errors']++;
                            try {
                                json = JSON.parse(request.responseText);
                                str = "Error '" + request.status + "' API '" + params + "'  returned:'" + request.responseText + "'";
                            } catch (pr) {
                                json = request.responseText;
                                str = "jchaos.basicPost Error parsing json body returned:'" + request.responseText + "'" + "' post:'" + params + "'";;
                            }
                            var str = "POST " + url + " body:\"" + params + "\" went wrong, result:" + request.status + " state:" + request.readyState;
                            jchaos.perror(str);
                            if (handleFuncErr != null && (typeof handleFuncErr === "function")) {
                                handleFuncErr(json);
                            } else {
                                if ((typeof json === "object")) {
                                    if (json.hasOwnProperty('error_status')) {
                                        jchaos.perror("Error:"+json.error_status);
                                    }
                                }
                                /*else {
								jchaos.perror(str);
							}*/



                            }
                        }
                    }

                }
                request.onerror = function(e) {
                    console.error("request error:" + request.statusText);
                    //throw "error:" + request.statusText;
                    if (handleFuncErr != null && (typeof handleFuncErr === "function")) {
                        handleFuncErr(request.responseText);
                    }
                };
                request.ontimeout = function(e) {
                    jchaos['timeouts']++;

                    console.error("request TIMEOUT:" + e.currentTarget.timeout);
                    //throw "error:" + request.statusText;
                    if (handleFuncErr != null && (typeof handleFuncErr === "function")) {
                        handleFuncErr("timeout " + e.currentTarget.timeout + " reached");
                    }
                };
                //console.log("sending:"+params);
                request.send(params);

                //  request.close();

            }
            /**
             * @hide
             */
        jchaos.addLongKey = function(obj, key, valuestr) {
                if (obj[key] == undefined) {
                    var tt = {}
                    tt['$numberLong'] = valuestr;
                    obj[key] = tt;
                }
                return obj;
            }
            /**
             * @hide
             */
        jchaos.getLongLong = function(obj, key) {
                return parseInt(obj[key].$numberLong);
            }
            /**
             * @hide
             */
        jchaos.setLongLong = function(obj, key, val) {
                if (!obj.hasOwnProperty(key)) {
                    jchaos.addLongKey(obj, key, val.toString());
                    return;
                }

            }
            /**
             * @hide
             */
        jchaos.normalizeDataset = function(obj) {
                jchaos.addLongKey(obj, 'dpck_hr_ats', "0");
                jchaos.addLongKey(obj, 'dpck_ats', "0");
                jchaos.addLongKey(obj, 'dpck_seq_id', "0");
            }
            /**
             * Registers a CU  dataset using REST 
             * @param  {string} cuid
             * @param  {object} obj the CU dataset to register/push
             * @param  {okcb} [handleFunc] handler on success, if present the call will be asynchronous
             * @param {badcb} [badhandler] handler on failure
             * @function registerCU
             */
        jchaos.registerCU = function(cuid, obj, handleFunc, badhandler) {
                var str_url_cu = "/api/v1/producer/jsonregister/" + cuid;
                var dd = Date.now();
                jchaos.normalizeDataset(obj);
                jchaos.basicPost(str_url_cu, JSON.stringify(obj), handleFunc, badhandler);
            }
            /**
             * Push a CU dataset using REST
             * @param  {string} cuid
             * @param  {object} obj the CU dataset to register/push
             * @param  {okcb} [handleFunc] handler on success, if present the call will be asynchronous
             * @param {badcb} [badhandler] handler on failure
             * @function pushCU
             */
        jchaos.pushCU = function(cuid, obj, handleFunc, badhandler) {
            var str_url_cu = "/api/v1/producer/jsoninsert/" + cuid;
            var dd = Date.now();
            jchaos.setLongLong(obj, 'dpck_seq_id', jchaos.getLongLong(obj, 'dpck_seq_id') + 1); -
            jchaos.setLongLong(obj, 'dpck_ats', dd);
            jchaos.setLongLong(obj, 'dpck_hr_ats', dd * 1000);

            if (typeof handleFunc !== "function") {
                jchaos.basicPost(str_url_cu, JSON.stringify(obj, jchaos.extendJson), null);
                return;

            }

            jchaos.basicPost(str_url_cu, JSON.stringify(obj, jchaos.extendJson), function(datav) { handleFunc(datav); }, badhandler);

        }

        /**
         * Helper function that wrap basic post used for query that regards generic MDS operations
         * @param  {string} cmd command to send
         * @param  {object} opt options
         * @param  {okcb} [handleFunc] handler on success, if present the call will be asynchronous
         * @param {badcb} [errFunc] handler on failure
         * @function mdsBase
         */
        jchaos.mdsBase = function(cmd, opt, handleFunc, errFunc) {
            var param = "cmd=" + cmd + "&parm=" + JSON.stringify(opt, jchaos.extendJson);
            var ret = jchaos.basicPost("MDS", param, handleFunc, errFunc);
            return ret;
        }

        /**
         * Start tagging a list of nodes for an interval of given time, expressed in cycles or ms
         * @param  {string} tagname
         * @param  {string|string[]} node_list
         * @param  {integer} tag_type (2= time in ms, 1=cycles)
         * @param  {integer} tag_value numer of ms or cycles
         * @param  {okcb} [handleFunc] handler on success, if present the call will be asynchronous
         * @param {badcb} [nok] handler on failure 
         * @function tag
         * @example
         * //tagging for 10s two CU (cameras), give the name burstbyseconds  
         * var camera_list=["TEST/FLAME/CMP/CAMERA/FLACMPFF","TEST/FLAME/CMP/CAMERA/FLMCMP01"];
         * jchaos.tag("burstbyseconds",camera_list,2,10000,function(d){jchaos.print("tagging started");});
         */

        jchaos.tag = function(tagname, node_list, tag_type, tag_value, handleFunc, nok) {
            var value = {};
            value['dsndk_history_burst_tag'] = tagname;
            value['dsndk_history_burst_type'] = tag_type;
            value['dsndk_history_burst_value'] = tag_value;

            if (node_list instanceof Array) {
                value['ndk_uid'] = node_list;
            } else {
                value['ndk_uid'] = [node_list];
            }
            return jchaos.snapshot("", "burst", "", JSON.stringify(value), handleFunc, nok);
        }

        /**
         * Check if a lists of CU have done a correct snapshot restore, the check is performed every timeout/10 ms for maximum timeout
         * @param  {string} _tagname name of the tag
         * @param  {string|string[]} _node_list list of nodes
         * @param  {integer} _timeout timeout
         * @param  {okcb} [_okhandler]
         * @param  {badcb} [_nokhandler]
         * @function checkRestore
         */
        jchaos.checkRestore = function(_tagname, _node_list, _timeout, _okhandler, _nokhandler) {
            var checkFreq = _timeout / 10;
            var retry = 10;
            if (_node_list == null) {
                _node_list = jchaos.search(_tagname, "insnapshot", true);
            }
            jchaos.checkPeriodiocally("checkRestore", retry, checkFreq, function() {
                var data = jchaos.getChannel(_node_list, 3, null);
                var oks = 0;
                data.forEach(function(ds) {
                    if ((ds.busy == false) && (ds.cudk_set_tag == _tagname) && (ds.cudk_set_state == 3)) {
                        jchaos.print(ds.ndk_uid + " OK reached");
                        oks++;
                    } else {
                        jchaos.print(ds.ndk_uid + " NOT YET busy:" + ds.busy + " restore state:" + ds.cudk_set_state);

                    }
                });
                if (oks == _node_list.length) {
                    return true;
                }
                return false;
            }, _okhandler, _nokhandler);
        }

        /**
         *  Helper function to check if a burst is running
         * @param  {string} _tagname name of the tag
         * @param  {string|string[]} _node_list list of nodes
         * @param  {integer} _timeout timeout
         * @param  {okcb} [_okhandler]
         * @param  {badcb} [_nokhandler]
         * @function checkBurstRunning
         * @example
         * // check the burst is running
         * var camera_list=["TEST/FLAME/CMP/CAMERA/FLACMPFF","TEST/FLAME/CMP/CAMERA/FLMCMP01"];
         * jchaos.checkBurstRunning("burstbyseconds",camera_list,10000,function(){jchaos.print("OK");},function(){chaos.error("BAD");})
         */
        jchaos.checkBurstRunning = function(_tagname, _node_list, _timeout, _okhandler, _nokhandler) {
                var checkFreq = _timeout / 10;
                var retry = 10;

                jchaos.checkPeriodiocally("checkBurstRunning", retry, checkFreq, function() {
                    var data = jchaos.getChannel(_node_list, 3, null);
                    var oks = 0;
                    data.forEach(function(ds) {
                        if ((ds.cudk_burst_state == true) && (ds.cudk_burst_tag == _tagname)) {
                            jchaos.print(ds.ndk_uid + " OK tagging");
                            oks++;
                        } else {
                            jchaos.print(ds.ndk_uid + " NOT YET ACQUIRING, burst state:" + ds.cudk_burst_state + " burst tag:" + ds.cudk_burst_tag);

                        }
                    });
                    if (oks == _node_list.length) {
                        return true;
                    }
                    return false;
                }, _okhandler, _nokhandler);
            }
            /**
             * Check if a list of CU ended correct burst, the check is performed every timeout/10 ms for maximum timeout
             * @param  {string} _tagname name of the tag
             * @param  {string|string[]} _node_list list of nodes
             * @param  {integer} _timeout timeout
             * @param  {okcb} [_okhandler]
             * @param  {badcb} [_nokhandler]
             * @function checkEndBurst
             * @example
             * // check the burst is running
             * var camera_list=["TEST/FLAME/CMP/CAMERA/FLACMPFF","TEST/FLAME/CMP/CAMERA/FLMCMP01"];
             * jchaos.checkEndBurst(camera_list,10000,function(){jchaos.print("OK");},function(){chaos.error("BAD");})
             */
        jchaos.checkEndBurst = function(_node_list, _timeout, _okhandler, _nokhandler) {
            var checkFreq = _timeout / 10;
            var retry = 10;

            jchaos.checkPeriodiocally("checkEndBurst", retry, checkFreq, function() {
                var data = jchaos.getChannel(_node_list, 3, null);
                var oks = 0;
                data.forEach(function(ds) {
                    if ((ds.cudk_burst_state == false)) {
                        jchaos.print(ds.ndk_uid + " OK End");
                        oks++;
                    } else {
                        jchaos.print(ds.ndk_uid + " STILL ACQUIRING burst state:" + ds.cudk_burst_state + " burst tag:" + ds.cudk_burst_tag);

                    }
                });
                if (oks == _node_list.length) {
                    return true;
                }
                return false;
            }, _okhandler, _nokhandler);
        }

        /**
         * Performs snapshot operations
         * <pre><code>
         * create (create a new snapshot of the given list of CUs)
         * load (retrive a create snapshot)
         * set (create a snapshot from a value)
         * delete (delete a snapshot)
         * restore (restore a snapshot)
         * burst (perform a burst tag operation see <b>tag</b>)
         * </code></pre> 
         * @see tag
         * @param  {string} _name name of the snapshot
         * @param  {"create"|"load"|"set"|"delete"|"restore"|"burst"} _what operation to perform
         * @param  {string|string[]} _node_list nodes to snapshot
         * @param  {object|okcb} [value_] parameter for set command
         * @param  {okcb|badcb} [handleFunc]
         * @param  {badcb} [nok]
         * @function snapshot
         * @example
         * // create a set point programmatically of a set of powersupply
         * var ps=["BTF/QUADRUPOLE/QUATB001","BTF/QUADRUPOLE/QUATB002","BTF/QUADRUPOLE/QUATB003"];
         * var powersupply_setpoint = {
        	"input": {
        		"ndk_uid": "undefined",
        		"current": 0.1,
        		"stby": true,
        		"polarity": 1
        	},
        	"output": {
        		"ndk_uid": "undefined",
        		"current": 0.1,
        		"stby": true,
        		"polarity": 1,
        		"local": false
        	}
        };
        var snapshot_set = [];
        	var polarity = 1;
        	var current = Number(0.0000001);

        	ps.forEach(function (elem) {
        		var snap = powersupply_setpoint;
        		snap.input.stby = true;
        		snap.input.current = current;
        		snap.input.ndk_uid = elem;
        		snap.input.polarity = polarity;
        		snap.output.ndk_uid = elem;
        		snap.output.polarity = polarity;
        		snap.output.stby = true;
        		snap.output.current = current;
        		polarity = polarity > 0 ? -1 : 1;
        		jchaos.snapshot("zero-stby", "set", "", snap, function (d) {
        			jchaos.print("set setpoint OK:"+JSON.stringify(snap));
        		});
        	});
         */
        jchaos.snapshot = function(_name, _what, _node_list, value_, handleFunc, nok) {
            var opt = {};
            if (_name instanceof Array) {
                opt['names'] = _name;
            } else {
                opt['name'] = _name;
            }
            opt['what'] = _what;
            if (_node_list instanceof Array) {
                opt['node_list'] = _node_list;
            } else {
                if (_node_list != null) {
                    opt['node_list'] = [_node_list];
                }

            }
            if (typeof value_ === "function") {
                nok = handleFunc;
                handleFunc = value_;
            } else {
                try {
                    //JSON.parse(value_);
                    if (typeof value_ === "object") {
                        opt['value'] = value_;
                    } else {
                        opt['value'] = JSON.parse(value_);
                    }

                } catch (e) {

                }
            }
            return jchaos.mdsBase("snapshot", opt, handleFunc, nok);
        }

        /**
         * get a US description
         @hide
         */

        jchaos.getUS = function(_name) {
                var ret = jchaos.node(_name, "get", "us", "", "", null);
                return ret;
            }
            /*
            get a US description
             * */
        jchaos.setUS = function(_name, _json) {
            var ret = jchaos.node(_name, "set", "us", "", _json, null);
            return ret;
        }

        /**
         * Perform and operation specified by '_what' onthe nodes of '_name' of type :'_type'
         * @param  {string|string[]} _name the name of the nodes where to perform the operation
         * @param  {"init"|"deinit"|"start"|"stop"|"get"|"set"|"del"|"killcmd"|"shutdown"|"kill"|"restart"|"desc"|"getlog"|"health"|"info"|"new"} _what operation type
         * @param  {"us"|"cu"|"agent"} _type target type of the command
         * @param  {string} [_parent] some commands needs a parent node to be specified
         * @param  {object} [value_] some commands needs a parameter
         * @param  {okcb} handleFunc
         * @param  {badcb} nok
         * @function node
         * @example
         * // stop|start|init|deinit a cu 
         * jchaos.node("BTF/QUADRUPOLE/QUATB001","stop","cu");
         * jchaos.node("BTF/QUADRUPOLE/QUATB001","start","cu");
         * 
         */
        jchaos.node = function(_name, _what, _type, _parent, value_, handleFunc, nok) {
                var opt = {};
                if (_name instanceof Array) {
                    if (_name.length == 0) {
                        return [];
                    }
                    opt['names'] = _name;
                } else {
                    opt['name'] = _name;
                }
                opt['what'] = _what;
                opt['type'] = _type;
                if (typeof _parent === 'function') {
                    handleFunc = _parent;
                    if (typeof value_ === 'function') {
                        nok = value_;
                    }
                    _parent = "";
                    value_ = null;
                }
                opt['parent'] = _parent;


                if (value_ != null) {
                    try {
                        JSON.stringify(value_); // check if json
                        opt['value'] = value_;
                      //  console.log("param:" + JSON.stringify(opt, jchaos.extendJson));
                    } catch (e) {
                        console.error("not a valid json error :'" + e + "' value:" + value_);
                        return;
                    }
                }
                return jchaos.mdsBase("node", opt, handleFunc, nok);
            }
            /**
             * @hide
             */
        jchaos.loadScript = function(_name, seqid, handleFunc, errFunc) {
                var opt = {};
                var value = {
                   // "seq": seqid,
                    "script_name": _name
                };
                opt['name'] = _name;
              //  opt['what'] = "load";
                opt['what'] = "fload";
                opt['value'] = value;
                return jchaos.mdsBase("script", opt, handleFunc, errFunc);
            }

            /**
             * @hide
             */
        jchaos.manageInstanceScript = function(script_name, script_seq, instance_name, create, handleFunc) {
                var opt = {};
                var script_desc = {};
                script_desc['script_seq'] = Number(script_seq);
                script_desc['script_name'] = script_name;

                script_desc['instance_name'] = instance_name;
                script_desc['create'] = create;
                opt['name'] = "";
                opt['what'] = "newInstance";
                opt['value'] = script_desc;
                return jchaos.mdsBase("script", opt, handleFunc);
            }
            /**
             * @hide
             */
        jchaos.saveScript = function(value, handleFunc) {
                var opt = {};

                opt['name'] = "";
                opt['what'] = "save";
                opt['value'] = value;
                return jchaos.mdsBase("script", opt, handleFunc);
            }
            /**
             * @hide
             */
        jchaos.rmScript = function(value, handleFunc) {
                var opt = {};

                opt['name'] = "";
                opt['what'] = "del";
                opt['value'] = value;
                return jchaos.mdsBase("script", opt, handleFunc);
            }
            /**
             * @hide
             */
        jchaos.searchScriptInstance = function(script_name, search_string, handleFunc, errfunc) {
                var opt = {};
                var script_desc = {};
                script_desc['script_name'] = script_name;
                script_desc['search_string'] = search_string;

                opt['name'] = "";
                opt['what'] = "searchInstance";
                opt['value'] = script_desc;
                return jchaos.mdsBase("script", opt, handleFunc, errfunc);
            }
            /**
             * @hide
             */
        jchaos.updateScriptInstance = function(script_instance, script_base_description, handleFunc) {
            var opt = {};
            var script_desc = {};
            script_desc['script_instance'] = script_instance;
            script_desc['script_base_description'] = script_base_description;

            opt['name'] = "";
            opt['what'] = "bind";
            opt['value'] = script_desc;
            return jchaos.mdsBase("script", opt, handleFunc);
        }

        /**
         * Allows to manage variables that are persistent (on DB) 
         * @param  {string|string[]} _name 
         * @param  {("set"|"get"|"del"|"search")} _what operation type
         * @param  {object} [value_] in case of set the object 
         * @param  {okcb} [handleFunc] callback if ok, enable async mode
         * @param  {badcb} [handleFunc] callback if failure
         * @function variable
         * @example
         * // store an object
         * var point={x:10.34,y:14.0};
         * jchaos.variable("mypoint","set",point);
         * // perform list
         * jchaos.variable("mypoint","search",function(ls){jchaos.print(JSON.stringify(ls));}); 
         * // get and visualize variable stored
         * jchaos.variable("mypoint","get",function(ls){jchaos.print(JSON.stringify(ls));});
         * // delete variable
         * jchaos.variable("mypoint","del");
         */
        jchaos.variable = function(_name, _what, value_, handleFunc, handlerr) {
                var opt = {};
                if (_name instanceof Array) {
                    opt['names'] = _name;
                } else {
                    opt['name'] = _name;
                }
                opt['what'] = _what;
                if (_what == 'search') {
                    return jchaos.search(_name, "variable", false, handleFunc, handlerr);
                }
                if (_what == "set") {
                    try {
                        if (!(value_ instanceof Object)) {
                            JSON.parse(param);

                        }
                        JSON.parse(value_);
                        opt['value'] = JSON.stringify(value_, jchaos.extendJson);

                    } catch (e) {
                        opt['value'] = value_;
                    }
                } else {
                    if (typeof value_ === "function") {
                        if (typeof handleFunc == "function") {
                            handlerr = handleFunc;
                        }
                        handleFunc = value_;
                    }
                }

                return jchaos.mdsBase("variable", opt, handleFunc, handlerr);
            }
            /**
             * Search logs for the given CUs
             * @param {string|string[]} devs to search
             * @param  {"search"} _what operation to perform
             * @param  {"all"|"Info"|"error"|"warning"|"log"|"command"} _type specify log type
             * @param  {integer} _start epoch in ms start of the search
             * @param  {integer} _end epoch md end of the search (-1 is now)
             * @param  {okcb} [handleFunc] callback if ok, enable async mode
             * @param  {badcb} [handlerr] callback if error
             * @function log
             * @example
             * // retrieve all logs for a given CU till now
             * jchaos.log("BTF/QUADRUPOLE/QUATB001","search","all",0,-1,function(ls){jchaos.print(JSON.stringify(ls));});

             */
        jchaos.log = function(devs, _what, _type, _start, _end, handleFunc, handlerr) {
                var opt = {};
                if (devs instanceof Array) {
                    opt['names'] = devs;
                } else {
                    opt['name'] = devs;
                }
                opt['what'] = _what;
                opt['type'] = _type;
                opt['start'] = _start;
                if (_end <= 0) {
                    _end = (new Date()).getTime();

                }
                opt['end'] = _end;

                return jchaos.mdsBase("log", opt, handleFunc, handlerr);
            }

        jchaos.nodeTypeToHuman=function(name){
            switch(name){
                case "nt_agent":
                    return "agent";
                case "nt_unit_server":
                    return "us";
                case "nt_control_unit":
                    return "cu";
                case "nt_root":
                    return "root";
                case "nt_wan_proxy":
                    return "webui";
                case "nt_data_service":
                    return "mds";
                default:
                    return "uknown";
            }
        }
            /**
		 * 
		 * @param {string} _name is the substring of what you want search
		 * @param {("cu"|"us"|"agent"|"cds"|"webui"|"root"|"variable"|"snapshotsof"|"snapshots"|"script"|"zone"|"class")} _what operation type 
		 * @param {boolean} _alive search among alive (true) or all(false)
		 * @param  {okcb} [handleFunc] callback if ok, enable async mode
		 * @param  {badcb} [handlerr] callback if error
		 * @return an array of strings or objects
		 * @function search
 		 * @example
 		 * // search all CU alive
         * jchaos.search("","cu",true,function(ls){jchaos.print(JSON.stringify(ls));});

		 */
        jchaos.search = function(_name, _what, _alive, opts, handleFunc, handlerr) {

                var opt = {
                    name: _name,
                    what: _what,
                    alive: _alive
                };
                if (_name instanceof Array) {
                    delete opt['name'];
                    opt['names'] = _name;
                }
                if (typeof opts === "function") {
                    handlerr = handleFunc;
                    handleFunc = opts;
                } else if (typeof opts === "object") {
                    for (var i in opts) {
                        //pagelen number of objects
                        //start
                        opt[i] = opts[i];
                    }
                }

                return jchaos.mdsBase("search", opt, handleFunc, handlerr);

            }
            /**
             * Find an array of CU with the given implementation
             * @param {string} impl C++ implementation name to find
             * @param {bool} alive search from alive or all
             * @param  {okcb} [handleFunc] callback if ok, enable async mode
             * @function findCUByImplementation
             * @example
             * // find implementation that starts with SCA(ctuators)
             * jchaos.findCUByImplementation("SCA",true,function(ls){jchaos.print(JSON.stringify(ls));});
             */
        jchaos.findCUByImplementation = function(impl, alive, handleFunc) {
            var implList = [];
            jchaos.search("", "cu", alive, function(lscu) {
                jchaos.getDesc(lscu, function(desclist) {
                    desclist.forEach(function(elem) {
                        if (String(elem.instance_description.control_unit_implementation).includes(impl)) {
                            implList.push(elem.ndk_uid);
                        }
                    });
                    handleFunc(implList);
                });
            });
        }

        /**
         * Return an array of CU that match a given status
         * @param  {string} status_to_search
         * @param  {okcb} [handleFunc] callback if ok, enable async mode
         * @function getCUStatus
         */
        jchaos.getCUStatus = function(status_to_search, handleFunc) {
                var cu_stats = [];
                var cu_to_search = [];
                var cnt = 0;
                jchaos.search("", "cu", false, function(data) {
                    cu_to_search = data;
                    jchaos.getChannel(cu_to_search, 4, function(ds) {
                        //	console.log("status:"+JSON.stringify(ds));
                        ds.forEach(function(elem) {
                            if (elem.hasOwnProperty("nh_status")) {
                                if (elem.nh_status == status_to_search) {
                                    cu_stats.push(elem.ndk_uid)
                                }
                            }

                        });
                        handleFunc(cu_stats);

                    });

                });

            }
            /**
             * convert an array into a CommaSepareted elements
             * @param {string[]} devs array
             * @returns {string}
             * @function convertArray2CSV
             */
        jchaos.convertArray2CSV = function(devs) {
            var dev_array = "";
            if (devs instanceof Array) {
                devs.forEach(function(elem, i, array) {
                    if (i < (array.length - 1)) {
                        dev_array += elem + ",";
                    } else {
                        dev_array += elem;
                    }
                });
            } else {
                dev_array = devs;
            }


            return dev_array;
        }

        /**
         * Retrive the specified dataset correspoding to a given CU
         * @param  {String|String[]} devs CU or array of CU
         * @param  {channelid} channel_id (-1: all,0: output, 1: input, 2:custom,3:system, 4: health, 5 cu alarm, 6 dev alarms,128 status)
         * @param  {okcb} [handleFunc] callback if ok, enable async mode
         * @param  {badcb} [badfunc] bad callback
         * @return {object} the specified dataset
         * @function getChannel
         * @example
         * //retrive all channels of a give CU
         * chaos.getChannel("BTF/QUADRUPOLE/QUATB001",-1,function(ls){jchaos.print(JSON.stringify(ls));});
         *
         */
        jchaos.getChannel = function(devs, channel_id, handleFunc, badfunc) {

                var dev_array = jchaos.convertArray2CSV(devs);

                if (dev_array == "") {
                    var empty = [{}];

                    if (typeof handleFunc !== "function") {
                        return empty;
                    }
                    handleFunc(empty);
                    return;
                }
                var str_url_cu = "dev=" + dev_array + "&cmd=channel&parm=" + channel_id;
                //	console.log("query:"+str_url_cu);
                if ((typeof handleFunc !== "function")) {
                    return jchaos.basicPost("CU", str_url_cu, null);
                }
                jchaos.basicPost("CU", str_url_cu, function(datav) {
                    jchaos.lastChannel = datav;
                    handleFunc(datav);
                }, badfunc);
            }
            /***
             * Retrieve a full description og the specified CU
             * @param  {string|string[]} cu CU or array of CU
             * @param  {okcb} [handleFunc] callback if ok, enable async mode
             * @function getDesc
             */
        jchaos.getDesc = function(devs, handleFunc) {

            var dev_array = jchaos.convertArray2CSV(devs);

            if (dev_array == "") {
                if ((typeof handleFunc === "function")) {
                    handleFunc([{}]);
                }
                return;
            }
            var str_url_cu = "dev=" + dev_array + "&cmd=desc";
            //	console.log("query:"+str_url_cu);
            if ((typeof handleFunc !== "function")) {
                return jchaos.basicPost("CU", str_url_cu, null);
            }
            jchaos.basicPost("CU", str_url_cu, function(datav) {
                jchaos.lastChannel = datav;
                handleFunc(datav);
            });
        }

        /***
         * Set a new scheduling time in us
         * @param  {string|string[]} cu CU or array of CU
         * @param {number} schedule_us enable disable
         * @param  {okcb} [handle] callback if ok, enable async mode
         * @param  {badcb} [nok] bad callback
         * @function setSched
         */
        jchaos.setSched = function(cu, schedule_us, handle, nok) {
                return jchaos.sendCUCmd(cu, "sched", Number(schedule_us), handle, nok);
            }
            /***
             * Enable or disable bypass on CU
             * @param  {string|string[]} dev CU or array of CU
             * @param {bool} enable enable disable
             * @param  {okcb} [handleFunc] callback if ok, enable async mode
             * @param  {badcb} [errFunc] bad callback
             * @function setBypass
             */
        jchaos.setBypass = function(dev, enable, handleFunc, errFunc) {
                var opt = {
                    "type": "cu",
                    "what": "set",
                    "value": { "properties": [{ "cudk_bypass_state": enable }] }
                };
                if (dev instanceof Array) {
                    opt['names'] = dev;
                } else {
                    opt['name'] = dev;
                }
                return jchaos.mdsBase("node", opt, handleFunc, errFunc);
            }
            /***
             * Enable or disable live on CU
             * @param  {string|string[]} dev CU or array of CU
             * @param {bool} enable enable disable
             * @param  {okcb} [handleFunc] callback if ok, enable async mode
             * @param  {badcb} [errFunc] bad callback
             * @function storageLive
             */
        jchaos.storageLive = function(dev, enable, handleFunc, errFunc) {
                jchaos.getChannel(dev, 3, function(cus) {
                    cus.forEach(function(elem, index) {
                        if (elem.hasOwnProperty('dsndk_storage_type')) {
                            var val = Number(elem.dsndk_storage_type);
                            val = (val & 0x1) | (enable << 1);
                            jchaos.setProperty(cus[index].ndk_uid, [{ "dsndk_storage_type": val }]);

                        }
                    })
                    handleFunc();
                }, errFunc);
            }
            /***
             * Enable or disable history on CU
             * @param  {string|string[]} dev CU or array of CU
             * @param {bool} enable enable disable
             * @param  {okcb} [handleFunc] callback if ok, enable async mode
             * @param  {badcb} [errFunc] bad callback
             * @function storageHisto
             */
        jchaos.storageHisto = function(dev, enable, handleFunc, errFunc) {
            jchaos.getChannel(dev, 3, function(cus) {
                cus.forEach(function(elem, index) {
                    if (elem.hasOwnProperty('dsndk_storage_type')) {
                        var val = Number(elem.dsndk_storage_type);
                        val = (val & 0x2) | (enable & 1);
                        jchaos.setProperty(cus[index].ndk_uid, [{ "dsndk_storage_type": val }]);

                    }
                })
                handleFunc();
            }, errFunc);
        }

        /**
         * Set a CU property
         * @param  {string|string[]} dev CU or array of CU
         * @param  {string} prop property name
         * @param  {okcb} [handleFunc] callback if ok, enable async mode
         * @param  {badcb} [errFunc] bad callback
         * @function setProperty
         */
        jchaos.setProperty = function(dev, prop, handleFunc, errFunc) {
                var opt = {
                    "type": "cu",
                    "what": "set",
                    "value": { "properties": prop }
                };
                if (dev instanceof Array) {
                    opt['names'] = dev;
                } else {
                    opt['name'] = dev;
                }

                return jchaos.mdsBase("node", opt, handleFunc, errFunc);
            }
            /**
             * Load or Unload a CU
             * @param  {string|string[]} dev CU or array of CU
             * @param  {bool} loadunload (true = load, false=unload)
             * @param  {okcb} [handleFunc] callback if ok, enable async mode
             * @param  {badcb} [nok] bad callback
             * @function loadUnload
             */
        jchaos.loadUnload = function(dev, loadunload, handleFunc, nok) {

                var opt = {

                    "type": "cu",
                    "what": loadunload ? "load" : "unload",
                };
                if (dev instanceof Array) {
                    opt['names'] = dev;
                } else {
                    opt['name'] = dev;
                }
                jchaos.mdsBase("node", opt, handleFunc, nok);
            }
            /**
             * @ignore
             */
        jchaos.forceState = function(devs, state, handleFunc) {
            jchaos.getChannel(devs, 4, function(data) {
                data.forEach(function(elem) {
                    var custate = "";
                    //console.log("force state:"+ JSON.stringify(elem));
                    var cuname = "";


                    if (elem.hasOwnProperty('nh_status')) {
                        custate = elem.nh_status;
                    } else {
                        return;
                    }
                    cuname = elem.ndk_uid;
                    //	console.log("["+cuname+"] force curr: " +custate+ " state:"+ state);

                    if (custate != "" && (state != custate)) {
                        //	console.log("CU \""+cuname+ " is in '"+custate+"' should go in '"+state+"'");	
                        if (state == "Start") {
                            switch (custate) {
                                case "Stop":
                                case "Init":
                                    jchaos.sendCUCmd(cuname, "start", "", handleFunc);
                                    break;
                                case "Deinit":
                                    jchaos.sendCUCmd(cuname, "init", "", function(d) {
                                        jchaos.sendCUCmd(cuname, "start", "", handleFunc);
                                    });
                                    break;

                            }
                        } else if (state == "Stop") {
                            switch (custate) {
                                case "Start":
                                    jchaos.sendCUCmd(cuname, "stop", "", handleFunc);
                                    break;
                                case "Deinit":
                                    jchaos.sendCUCmd(cuname, "init", "", function(handleFunc) {
                                        jchaos.sendCUCmd(cuname, "start", "", function(handleFunc) {
                                            jchaos.sendCUCmd(cuname, "stop", "", handleFunc);
                                        });

                                    });
                                    break;
                                case "Init":
                                    jchaos.sendCUCmd(cuname, "start", "", function(handleFunc) {
                                        jchaos.sendCUCmd(cuname, "stop", "", handleFunc);
                                    });

                                    break;
                            }
                        } else if (state == "Deinit") {
                            switch (custate) {
                                case "Stop":
                                    jchaos.sendCUCmd(cuname, "deinit", "", handleFunc);
                                    break;
                                case "Init":
                                    jchaos.sendCUCmd(cuname, "deinit", "", handleFunc);
                                    break;
                                case "Start":
                                    jchaos.sendCUCmd(cuname, "stop", "", function(handleFunc) {
                                        jchaos.sendCUCmd(cuname, "deinit", "", handleFunc);
                                    });

                                    break;
                            }
                        } else if (state == "Init") {
                            switch (custate) {
                                case "Stop":
                                    jchaos.sendCUCmd(cuname, "deinit", "", function(handleFunc) {
                                        jchaos.sendCUCmd(cuname, "init", "", handleFunc);
                                    });
                                    break;
                                case "Deinit":
                                    jchaos.sendCUCmd(cuname, "init", "", handleFunc);
                                    break;
                                case "Start":
                                    jchaos.sendCUCmd(cuname, "stop", "", function(handleFunc) {
                                        jchaos.sendCUCmd(cuname, "deinit", "", function(handleFunc) {
                                            jchaos.sendCUCmd(cuname, "init", "", handleFunc);
                                        });
                                    });

                                    break;
                            }
                        }
                    }
                });
            });
        }

        /**
         * @param  {string|string[]} devs CU or array of CU
         * @param  {string} attr attribute name
         * @param  {string} value attribute value
         * @param  {okcb} [handleFunc] callback if ok, enable async mode
         * @param  {badcb} [handleFuncErr] bad callback
         */
        jchaos.setAttribute = function(devs, attr, value, handleFunc, handleFuncErr) {
            //var parm="{\""+attr+"\":\""+value+"\"}";
            var parm = {};
            parm[attr] = value;
            jchaos.sendCUCmd(devs, "attr", parm, handleFunc, handleFuncErr);
        }

        /**
         * Sends a command to a CU
         * @param  {string|string[]} devs CU or array of CU
         * @param  {cmdPar} cmd command to send
         * @param  {object} [param] optional and my be included into cmd
         * @param  {okcb} [handleFunc] callback if ok, enable async mode
         * @param  {badcb} [handleFuncErr] bad callback
         * @function sendCUCmd
         */
        jchaos.sendCUCmd = function(devs, cmd, param, handleFunc, handleFuncErr) {
                if ((cmd instanceof Object) && ((typeof param === "function") || (typeof param === "undefined"))) {
                    // all coded into cmd, handlefunc
                    var parm = "";
                    var prio = 0;
                    var mode = 0;
                    var cm = "";
                    handleFuncErr = handleFunc;
                    handleFunc = param;
                    if (cmd.hasOwnProperty('cmd')) {
                        cm = cmd['cmd'];
                    } else {
                        throw ("'cmd' must be specified");
                    }

                    if (cmd.hasOwnProperty('param')) {
                        parm = cmd['param'];
                    }
                    if (cmd.hasOwnProperty('prio')) {
                        prio = cmd['prio'];
                    }
                    if (cmd.hasOwnProperty('mode')) {
                        mode = cmd['mode'];
                    }

                    jchaos.sendCUFullCmd(devs, cm, parm, mode, prio, handleFunc, handleFuncErr);

                } else {

                    jchaos.sendCUFullCmd(devs, cmd, param, 0, 0, handleFunc, handleFuncErr);
                }
            }
            /**
             * Sends a command to a CU, with explicit params
             * @param  {string|string[]} devs CU or array of CU
             * @param  {string} cmd command to send
             * @param  {string|object} [param]
             * @param  {integer} force
             * @param  {integer} prio
             * @param  {okcb} [handleFunc] callback if ok, enable async mode
             * @param  {badcb} [handleFuncErr] bad callback
             * @function sendCUFullCmd
             */
        jchaos.sendCUFullCmd = function(devs, cmd, param, force, prio, handleFunc, handleFuncErr) {
            var dev_array = jchaos.convertArray2CSV(devs);
            var params = "";
            if (dev_array == "") {
                //	throw "must specify target(s) devices";
                console.error("no device specified, command skipped");
                return;
            }
            try {
                if (!(param instanceof Object)) {
                    JSON.parse(param);

                }
                params = JSON.stringify(param, jchaos.extendJson);
            } catch (e) {
                params = param;

            }
            var str_url_cu = "dev=" + dev_array + "&cmd=" + cmd + "&mode=" + force + "&prio=" + prio;
            if (params != "") {
                str_url_cu = str_url_cu + "&parm=" + params;
            }
            jchaos.print("sending command: " + str_url_cu);

            if ((typeof handleFunc !== "function")) {
                return jchaos.basicPost("CU", str_url_cu, null);
            }
            jchaos.basicPost("CU", str_url_cu, handleFunc, handleFuncErr);
        }

        /**
         * Retrive history of a channel dataset of a  group of devices
         * @param  {string|string[]} devs CU or array of CU
         * @param  {integer} channel channel to retrieve
         * @param  {integer|string} start epoch timestamp in ms (GMT) of start of search
         * @param  {integer|string} stop  epoch timestamp in ms (GMT) of start of search
         * @param  {string} [varname] optional name of the variable to retrieve (instead of all)
         * @param  {okcb} [handleFunc] callback if ok, enable async mode
         * @param  {string|string[]} [tagsv] optional tags
         * @param  {badcb} [funcerr] optional bad callback
         * @function getHistory
         */
        jchaos.getHistory = function(devs, channel, start, stop, varname, handleFunc, tagsv, funcerr) {
                var result = {
                    X: [],
                    Y: [],
                    nitems: 0
                };
                var opt = {};
                //var regex=/^[0-9]+$/;
                if (!isNaN(start)) {
                    opt['start'] = Number(start);
                } else {
                    opt['start'] = start;

                }
                if (!isNaN(stop)) {
                    opt['end'] = Number(stop);

                } else {
                    opt['end'] = stop;
                }
                if (tagsv instanceof Array) {
                    if (tagsv.length > 0) {
                        opt['tags'] = tagsv;
                    }
                } else if (typeof tagsv === "string") {
                    opt['tags'] = [tagsv];

                } else if (tagsv instanceof Object) {
                    for (var k in tagsv) {
                        opt[k] = tagsv[k];
                    }
                }

                opt['channel'] = channel;
                if (!opt.hasOwnProperty('page')) {
                    opt['page'] = jchaos.options.history_page_len;
                }
                if (varname !== "undefined" && (typeof varname !== "string")) {
                    opt['var'] = varname;
                }

                jchaos.getHistoryBase(devs, opt, 0, 0, result, handleFunc, funcerr);

            }
            /**
             * Retrive history and write a local zip
             * @param  {string} zipname
             * @param  {string|string[]} cams array of CU
             * @param  {integer|string} start epoch timestamp in ms (GMT) of start of search
             * @param  {integer|string} stop  epoch timestamp in ms (GMT) of start of search
             * @param  {string[]} [tagsv] tags
             * @param  {okcb} updateCall
             * @param  {badcb} errCall
             * @function fetchHistoryToZip
             */
        jchaos.fetchHistoryToZip = function(zipname, cams, start, stop, tagsv, updateCall, errCall) {
            var vcams;
            if (cams instanceof Array) {
                vcams = cams;
            } else {
                vams = [cams];
            }
            // need JSzip
            var zipf = new JSZip();
            var cnt = vcams.length;
            var per = 0.1;
            updateCall({
                percent: per
            });
            vcams.forEach(function(ci) {
                jchaos.getHistory(ci, 0, start, stop, "", function(ds) {
                    if ((ds.Y[0] instanceof Object)) {
                        if ((ds.Y[0].hasOwnProperty("FRAMEBUFFER")) && (ds.Y[0].FRAMEBUFFER.hasOwnProperty("$binary")) && (ds.Y[0].hasOwnProperty("FMT"))) {
                            ds.Y.forEach(function(img) {

                                var name = ci + "/" + img.dpck_ats + "_" + img.cudk_run_id + "_" + img.dpck_seq_id + "" + img.FMT;
                                zipf.file(name, img.FRAMEBUFFER.$binary.base64, { base64: true });
                                jchaos.print("zipping image: " + name + " into:" + zipname);

                            });
                        } else {
                            var name = ci + ".json";
                            zipf.file(name, JSON.stringify(ds.Y));
                            jchaos.print("zipping dataset: " + name + " into:" + zipname);
                        }


                        if (--cnt == 0) {
                            zipf.generateAsync({ type: "blob" }, updateCall).then(function(content) {
                                saveAs(content, zipname);
                            });
                        }
                    } else {
                        console.log("Nothing found");
                        updateCall({
                            percent: 0
                        });
                        if (typeof errCall == "function") {
                            errCall("Nothing found from " + start + " to:" + stop);
                        }
                    }
                }, tagsv);
            });


        }

        jchaos.getHistoryBase = function(devs, opt, seq, runid, result, handleFunc, funcErr) {
            var cmd = "queryhst";
            var dev_array = jchaos.convertArray2CSV(devs);

            opt['seq'] = seq;
            opt['runid'] = runid;

            var str_url_cu = "dev=" + dev_array + "&cmd=" + cmd + "&parm=" + JSON.stringify(opt, jchaos.extendJson);
            var start_string = (new Date(opt.start)).toLocaleString();
            var stop_string = (new Date(opt.end)).toLocaleString();

            console.log("getHistory " + dev_array + " (seqid:" + seq + " runid:" + runid + ") start:" + start_string + " end:" + stop_string + " page:" + opt.page);
            jchaos.basicPost("CU", str_url_cu, function(datav) {
                var ret = true;
                if (datav.data instanceof Array) {
                    result['nitems'] += datav.data.length;

                    if ((opt.var != null) && (opt.var != "")) {
                        datav.data.forEach(function(ele) {
                            result.X.push(Number(ele.ts));
                            result.Y.push(ele.val);
                        });
                    } else {
                        datav.data.forEach(function(ele) {
                            result.X.push(Number(ele.dpck_ats));
                            result.Y.push(ele);
                        });

                    }
                }
                result['devs'] = devs;
                result['query'] = opt;
                result['end'] = datav.end;
                result['runid'] = datav.runid;
                result['seqid'] = datav.seqid;
                if (jchaos.options.updateEachCall) {
                    if (datav.hasOwnProperty("count")) {
                        result["count"] = datav.count;
                    }
                    ret = handleFunc(result);
                    result.X = [];
                    result.Y = [];

                } else {
                    if (datav.end == 1) {
                        // update if 0 or something else
                        if (datav.hasOwnProperty("count")) {
                            result["count"] = datav.count;
                        }
                        handleFunc(result);

                    }
                }
                if (ret && (datav.end == 0)) {
                    if (datav.hasOwnProperty("count")) {
                        opt["count"] = datav.count;
                    }
                    jchaos.getHistoryBase(devs, opt, datav.seqid + 1, datav.runid, result, handleFunc, funcErr);
                }
            }, funcErr);
        }


        /**
         * Helper function th check a periodically a condition
         * the difference with check live is the check function don't receive a dataset in input
         * @param  {string} str string to display each time the check is performed
         * @param  {integer} retry retry the check for a maximum of number of time
         * @param  {integer} checkFreq check frequency in ms
         * @param  {okcb} checkFunc check function, should return true if ok or false if fails
         * @param  {okcb} okhandle callback to call if test succeed
         * @param  {badcb} nokhandle callback to call if fails
         * @function checkPeriodiocally
         * @see checkLive
         * @see checkBurstRunning
         */
        jchaos.checkPeriodiocally = function(str, retry, checkFreq, checkFunc, okhandle, nokhandle) {
            setTimeout(function() {
                if (checkFunc()) {
                    okhandle();
                } else if (--retry > 0) {
                    console.log(str + " retry check... " + retry);

                    jchaos.checkPeriodiocally(str, retry, checkFreq, checkFunc, okhandle, nokhandle);
                } else {
                    console.log(str + " expired maximum number of retry...");

                    nokhandle();
                }
            }, checkFreq);
        };

        /**
         * saveFullConfig
         * Save to local disk the state of fundamental configurations
         * @function saveFullConfig
         * @example
         * //save the infrastructure info.
         * saveFullConfig();
         */
        jchaos.saveFullConfig = function(name) {
            //find all US
            var obj = {};
            obj['agents'] = [];
            var agent_list = jchaos.search("", "agent", false, false);
            agent_list.forEach(function(item) {
                var agent = {
                    "name": item,
                };
                var info = jchaos.node(item, "info", "agent", "", null);
                agent['info'] = info;
                obj['agents'].push(agent);;
            });
            obj['us'] = [];
            var us_list = jchaos.search("", "us", false, false);
            us_list.forEach(function(item) {
                var data = jchaos.node(item, "get", "us", "", null);
                obj['us'].push(data);

            });
            // snapshots
            obj['snapshots'] = [];
            var snaplist = jchaos.search("", "snapshots", false);
            snaplist.forEach(function(item) {
                var snap = {
                    snap: item,
                };
                var dataset = jchaos.snapshot(item.name, "load", null, "");
                snap['dataset'] = dataset;
                obj['snapshots'].push(snap);
            });
            // scripts
            var sc_list=jchaos.search("","script",false,null);
            obj['scripts']=[];
            if(sc_list.hasOwnProperty("found_script_list")&&(sc_list.found_script_list instanceof Array)){
                sc_list.found_script_list.forEach(function(ele){
                    var l=jchaos.loadScript(ele.script_name,"");
                    obj['scripts'].push(l);
                });
        }
            // graphs

            obj['graphs'] = jchaos.variable("highcharts", "get", null, null);
            obj['cu_templates'] = jchaos.variable("cu_templates", "get", null, null);
            var blob = new Blob([JSON.stringify(obj)], { type: "json;charset=utf-8" });
            if (typeof name === "undefined") {
                saveAs(blob, "configuration.json");
            } else {
                saveAs(blob, name + ".json");

            }
        }
        jchaos.removeAllAssociation = function(cuid) {
            var agl = jchaos.search("", "agent", false, false);
            jchaos.node(agl, "del", "agent", cuid, null);

            /*for(var l in agl){
            	var agent=agl[l];
            	jchaos.node(agent, "del", "agent", cuid, null);
            	
            }*/
            return;
        }

        /*jchaos.agentSave=function (json, obj) {
        if (json.hasOwnProperty("andk_node_associated") && (json.andk_node_associated instanceof Array)) {
        	json.andk_node_associated.forEach(function (tostay) {
        		jchaos.removeAllAssociation(tostay.ndk_uid);
        	});
        	var node_selected = obj.node_selected;

        	  json.andk_node_associated.forEach(function (item) {
        		jchaos.node(node_selected, "set", "agent", null, item, function (data) {
        		  console.log("agent save: \"" + node_selected + "\" value:" + JSON.stringify(json));
        		  if (item.node_log_at_launch) {
        			jchaos.node(item.ndk_uid, "enablelog", "agent", null, null, function (data) {
        			});
        		  } else {
        			jchaos.node(item.ndk_uid, "disablelog", "agent", null, null, function (data) {
		
        			});
        		  }
        		  return 0;
        		});
        	  });
        	} 
          }*/
        jchaos.associateNode=function(agentid,nodeid,cmdline,scriptname,autostart,keepalive,logenable,okcb,badcb){
            if(typeof autostart !== "boolean"){
                autostart = true;
            }
            if(typeof keepalive !== "boolean"){
                keepalive = false;
            }
            if(typeof logenable !== "boolean"){
                logenable = false;
            }
            var tmp = {
                ndk_uid: nodeid,
                association_uid: 0,
                node_launch_cmd_line:cmdline,
                node_script_id: "",
                node_workdir: "",
                node_auto_start: autostart,
                node_keep_alive: keepalive,
                node_log_at_launch: logenable,
                instance_name:agentid
            };
            if((typeof scriptname==="string" )&&(scriptname!="")){
                jchaos.loadScript(scriptname, "", function (dscript) {
                    tmp.node_script_id=scriptname;
                    if(dscript['eudk_script_language']=="CPP"){
                        tmp['node_launch_cmd_line']="chaosRoot --rootopt \"-q " + scriptname + dscript['default_argument'] + "\"";
                        jchaos.node(nodeid,"new","root",agentid,null,function(){
                       //     console.log("created new node "+nodeid);
                        },function(err){
                            console.log("## error creating new node "+JSON.stringify(tmp));

                        }); //create the container

                    }
                    jchaos.node(agentid, "set", "agent", null, tmp, function(){
                      //  console.log("association done "+agentid+" - "+JSON.stringify(tmp));
                        if(typeof okcb==="function")
                            okcb();
                    },function(err){
                        console.log("## error association  "+agentid+" : "+JSON.stringify(err));
                        if(typeof badcb==="function")
                            badcb();

                    
                }
                );

                },badcb);
            } else {
                jchaos.node(agentid, "set", "agent", null, tmp, okcb,badcb);

            }
        }
        jchaos.agentSave = function(json, obj, ok, bad) {
            // remove all the associations
            var node_selected=""
            if (obj != null) {
                node_selected = obj.node_selected;
                var list_to_remove = [];
                jchaos.node(node_selected, "info", "agent", function(data) {
                    if (data.hasOwnProperty("andk_node_associated") && (data.andk_node_associated instanceof Array)) {
                        //rimuovi tutte le associazioni precedenti.
                        data.andk_node_associated.forEach(function(item) {
                            if (item.hasOwnProperty("ndk_uid")) {
                                var found = false;
                                if (json.hasOwnProperty("andk_node_associated") && (json.andk_node_associated instanceof Array)) {
                                    json.andk_node_associated.forEach(function(tostay) {
                                        if (tostay.ndk_uid == item.ndk_uid) {
                                            found = true;
                                        }
                                    });

                                }
                                if (found == false) {
                                    list_to_remove.push(item.ndk_uid);
                                }
                            }
                        });
                        list_to_remove.forEach(function(item) {
                            console.log("Agent remove association " + item);
                            jchaos.node(node_selected, "del", "agent", item, function(daa) {});
                        });
                    }
                });
            }else {
                node_selected=json['instance_name'];
            }

            if (json.hasOwnProperty("andk_node_associated") && (json.andk_node_associated instanceof Array)) {
                var assok = 0;
                json.andk_node_associated.forEach(function(item) {
                    jchaos.node(node_selected, "set", "agent", null, item, function(data) {
                        console.log("agent save: \"" + node_selected + "\" value:" + JSON.stringify(json));
                        assok++;
                        if (item.node_log_at_launch) {
                            jchaos.node(item.ndk_uid, "enablelog", "agent", function(data) {});
                        } else {
                            jchaos.node(item.ndk_uid, "disablelog", "agent", function(data) {

                            });
                        }

                        if (assok == json.andk_node_associated.length) {
                            if (typeof ok === "function") {
                                ok(json);
                            }
                        }
                        return 0;
                    }, bad);
                });


            }
        }


        jchaos.unitServerSave = function(json, obj, ok, nok) {
            if ((json == null) || !json.hasOwnProperty("ndk_uid")) {
                jchaos.perror("no ndk_uid key found");
                if(typeof bad ==="function"){bad("CU parent not defined");}
                    
                return 1;
            }
            if (json.ndk_uid == "") {
                jchaos.perror("US name cannot be empty");
                if(typeof bad ==="function"){bad("US name cannot be empty");}
               
                return 2;
            }
            var node_selected = json.ndk_uid;
            if (node_selected == null || node_selected == "") {
                jchaos.perror("not US selected!");
                if(typeof bad ==="function"){bad("not US selected!");}
               
                return 3;
            }

            var data = jchaos.node(node_selected, "get", "us", "", null, null);


            if ((data instanceof Object) && data.hasOwnProperty("us_desc")) {
                if (data.us_desc.hasOwnProperty("cu_desc") && (data.us_desc.cu_desc instanceof Array)) {
                    data.us_desc.cu_desc.forEach(function(item) {
                        var found = false;
                        // remove just the cu not present in new configuration
                        json.cu_desc.forEach(function(items) {
                            if (items.ndk_uid == item.ndk_uid) {
                                found = true;
                            }
                        });
                        if ((found == false) && (item.ndk_uid != "")) {
                            console.log("deleting cu:\"" + item.ndk_uid + "\"");
                            jchaos.node(item.ndk_uid, "del", "cu", node_selected, null);

                        }
                    });

                }
            }

            json.cu_desc.forEach(function(item, index) {
                json.cu_desc[index].ndk_parent = node_selected;
                json.cu_desc[index] = jchaos.extendStringKey(item, 'cudk_load_param');
                if (item.hasOwnProperty('cudk_driver_description')) {
                    item.cudk_driver_description.forEach(function(el, i) {
                        json.cu_desc[index].cudk_driver_description[i] = jchaos.extendStringKey(el, 'cudk_driver_description_init_parameter');

                    });

                }

            });

            jchaos.node(node_selected, "set", "us", "", json, function() {
                if (typeof ok === "function") {
                    ok(json);
                }
            }, nok);
            return 0;
        }

        jchaos.cuSave = function(json, obj, ok, bad) {

            if ((json != null) && json.hasOwnProperty("ndk_uid")) {
                var name = json.ndk_uid;
                if (!json.hasOwnProperty("ndk_parent")) {
                    
                    jchaos.perror("CU parent not defined");
                    if(typeof bad ==="function"){bad("CU parent not defined");}
                    return 1;
                }
                json = jchaos.extendStringKey(json, 'cudk_load_param');
                if (json.hasOwnProperty('cudk_driver_description')) {
                    json.cudk_driver_description.forEach(function(elem, index) {
                        json.cudk_driver_description[index] = jchaos.extendStringKey(elem, 'cudk_driver_description_init_parameter');

                    });

                }

                jchaos.node(json.ndk_uid, "set", "cu", json.ndk_parent, json, ok, bad);
            } else {
                if (typeof bad === "function") {
                    bad("No ndk_uid field found");
                }
                jchaos.perror("No ndk_uid field found");
            }
            return 0;
        }
        jchaos.newCuSave = function(json, obj, ok, bad) {
            var node_selected = null;
            if ((typeof obj === "object") && (obj.hasOwnProperty('node_selected'))) {
                node_selected = obj.node_selected;
            }
            if ((node_selected == null || node_selected == "")) {
                if (json.ndk_parent == "") {
                    jchaos.perror("not US selected!");
                    if (typeof bad === "function") {
                        bad("not US selected!");
                    }
                    return 1;
                } else {
                    console.log("using US specified into CU:" + json.ndk_parent);
                    var us_list = jchaos.search(json.ndk_parent, "us", false, false);
                    if (us_list.length == 0) {
                        if (typeof bad === "function") {
                            bad("US specified in CU does not exist (create before)");
                        }
                        jchaos.perror("US specified in CU does not exist (create before)");
                        return -1;
                    }
                    node_selected = json.ndk_parent;
                }
            }
            if (!json.hasOwnProperty("control_unit_implementation") || json.control_unit_implementation == "") {
                if (typeof bad === "function") {
                    bad("You must specify a valid implementation 'control_unit_implementation' " + JSON.stringify(json));
                }
                jchaos.perror("You must specify a valid implementation 'control_unit_implementation' " + JSON.stringify(json));
                return 1;
            }
            if (!json.hasOwnProperty("ndk_uid") || json.ndk_uid == "") {
                jchaos.perror("You must specify a valid UID 'ndk_uid'");
                if (typeof bad === "function") {
                    bad("You must specify a valid UID 'ndk_uid'");
                }

                return 1;
            }
            if (json.hasOwnProperty("ndk_uid") && (json.ndk_uid != "")) {
                jchaos.node(node_selected, "get", "us", "", null, function(data) {
                    console.log("adding \"" + json.ndk_uid + "\" to US:\"" + node_selected + "\"");
                    json.ndk_parent = node_selected;
                    if (data.us_desc.hasOwnProperty("cu_desc") && (data.us_desc.cu_desc instanceof Array)) {
                        data.us_desc.cu_desc.push(json);
                    } else {
                        data.us_desc["cu_desc"] = [json];
                    }
                    jchaos.node(node_selected, "set", "us", "", data.us_desc, ok, bad);
                });
            } else {
                jchaos.perror("missing required field ndk_uid");
                if (typeof bad === "function") {
                    bad("missing required field ndk_uid");
                }
                return 1;
            }
            return 0;
        }

        /**
         * Restore a full configuration from file
         * @function restoreFullConfigFromFile
         */
        jchaos.restoreFullConfigFromFile = function(fname) {
                if (typeof fname === "undefined" || fname == null) {

                }
                var reader = new FileReader();
                reader.onload = function(e) {
                    jchaos.restoreFullConfig(JSON.parse(e.target.result));

                }
            }
            /**
             * Restore a previously a configuration into the infrastructure
             * @param  {object} config
             * @param  {string[]} configToRestore array of things to restore "us","agents","snapshots","graphs","custom_group","cu_templates"
             * @function restoreFullConfig
             */
        jchaos.restoreFullConfig = function(config, configToRestore) {
                var node_selected = "";
                if (!(configToRestore instanceof Array)) {
                    configToRestore = ["us", "agents", "snapshots", "graphs", "custom_group", "cu_templates", "scripts"];
                }
                console.log("configs to restore:" + JSON.stringify(configToRestore));
                
                if (!(configToRestore instanceof Array)) {
                    return;
                }
                configToRestore.forEach(function(sel) {

                    if ((sel == "scripts") && (config instanceof Object) && 
                    (config.hasOwnProperty("scripts") && (config['scripts'] instanceof Array))) {
                        config['scripts'].forEach(function(sc){
                        console.log("restoring script " + sc['script_name']);

                        jchaos.saveScript(sc, function (data) {
                        },function(err){
                            console.error("## restoring script " + sc['script_name']+ " err:"+JSON.stringify(err));

                        });
                    });
                }
                    if (sel == "us") {
                        if (config.hasOwnProperty('us') && (config.us instanceof Array)) {
                            config.us.forEach(function(data) {

                                if ((data != null) && data.us_desc.hasOwnProperty("cu_desc") && (data.us_desc.cu_desc instanceof Array)) {
                                    data.us_desc.cu_desc.forEach(function(item) {
                                        jchaos.node(item.ndk_uid, "del", "cu", item.ndk_parent, null);
                                    });
                                    node_selected = data.us_desc.ndk_uid;

                                    jchaos.unitServerSave(data.us_desc);
                                }
                            });
                        } else if (config.hasOwnProperty("us_desc")) {
                            if (config.us_desc.hasOwnProperty("cu_desc") && (config.us_desc.cu_desc instanceof Array)) {
                                config.us_desc.cu_desc.forEach(function(item) {
                                    jchaos.node(item.ndk_uid, "del", "cu", item.ndk_parent, null);
                                });
                                node_selected = config.us_desc.ndk_uid;
                                jchaos.unitServerSave(config.us_desc);

                            }
                        };
                    } else if (config.hasOwnProperty("cu_desc")) {

                        var parent = config.cu_desc.ndk_parent;
                        if (config.hasOwnProperty("cu_desc")) {
                            var tmp = config.cu_desc;
                            //jsonEdit(templ, tmp);
                            jchaos.newCuSave(tmp);
                        }
                    }
                    if ((sel == "agents") && config.hasOwnProperty('agents') && (config.agents instanceof Array)) {
                        config.agents.forEach(function(json) {
                            config.agents.forEach(function(json) {
                                if(json.info.andk_node_associated instanceof Array){
                                    json.info.andk_node_associated.forEach(function(ele){
                                        console.log("associating "+json.name + " to:"+ele.ndk_uid);
                                        jchaos.node(json.name, "set", "agent", null, ele, function(data) {
                                        },function(err){
                                            console.error("## restoring agent " + json.name+ "  value:"+JSON.stringify(ele)+ " err:"+JSON.stringify(err));
                
                                        });    
    
                                    });
                                }
                            });

                            
                        });
                    }
                    if ((sel == "snapshots") && config.hasOwnProperty('snapshots') && (config.snapshots instanceof Array)) {
                        config.snapshots.forEach(function(json) {
                            console.log("restoring snapshot '" + json.snap.name + "' created:" + (new Date(json.snap.ts)).toString());

                            jchaos.snapshot(json.snap.name, "set", "", json.dataset, function(d) {
                            },function(err){
                                console.error("## restoring snapshot " + json.snap.name +"  value:"+JSON.stringify(json.dataset)+ " err:"+JSON.stringify(err));
    
                            });
                        });
                    }
                    if ((sel == "graphs") && config.hasOwnProperty('graphs') && (config.graphs instanceof Object)) {
                        console.log("restoring graphs");

                        jchaos.variable("highcharts", "set", config.graphs, function(s) {
                            high_graphs = config.graph;
                        },function(err){
                            console.error("## restoring graphs value:"+JSON.stringify(config.graphs)+ " err:"+JSON.stringify(err));

                        });

                    }
                    if ((sel == "custom_group") && config.hasOwnProperty('custom_group') && (config.custom_group instanceof Array)) {
                        console.log("restoring custom groups.");

                        jchaos.variable("custom_group", "set", config.custom_group, function(s) {
                            custom_group = config.custom_group;
                        },function(err){
                            console.error("## restoring custom group:"+JSON.stringify(config.custom_group)+ " err:"+JSON.stringify(err));

                        });

                    }
                    if ((sel == "cu_templates") && (config instanceof Object) && (config.hasOwnProperty("cu_templates"))) {
                        console.log("restoring CU templates.");

                        jchaos.variable("cu_templates", "set", config["cu_templates"], function(s) {
                        },function(err){
                            console.error("## restoring CU templates:"+JSON.stringify(config["cu_templates"])+ " err:"+JSON.stringify(err));

                        });

                    }

                    });
            }
            /**
             * activeAgentList
             * return a list of agents addresses in the callback
             * @param {okcb} cb callback called with the agent object list
             * @return {object[]} return in the callback the list descriptor of the agents 
             * @function activeAgentList
             * @example
             * jchaos.activeAgentList(function(cb){jchaos.print(JSON.stringify(cb));})
             */
        jchaos.activeAgentList = function(cb) {
            jchaos.search("", "agent", true, function(ag) {
                var agent_list = [];
                var cnt_agent = 0;
                ag.forEach(function(elem) {
                    jchaos.node(elem, "info", "agent", function(aginfo) {
                        if (aginfo.hasOwnProperty('instance_name')) {
                            if ((aginfo.instance_name == "")) {
                                aginfo.instance_name = elem;
                            }
                        } else {
                            aginfo['instance_name'] = elem;
                        }
                        agent_list.push(aginfo);
                        if (++cnt_agent == ag.length) {
                            if (typeof cb === "function") {
                                cb(agent_list);
                            }
                        }
                    });

                });

            });

        }

        /**
         * Return a vector of process information in the callback
         * @param {string[]} agl list of agents info
         * @param {okcb} cb callback called with the agent object list
         * @function getAllProcessInfo   
         * */
        jchaos.getAllProcessInfo = function(agl, cb) {
                var agent_obj = {};
                var proc_list = [];
                var tmpObj = {};
                var cnt = 0;
                var proc = {};
                agl.forEach(function(ser) {
                    var server = "";
                    if (ser.hasOwnProperty('ndk_host_name') && (ser.ndk_host_name !== "")) {
                        server = ser.ndk_host_name;
                    } else {
                        var regx = /(.+)\:(.+)/;
                        var match = regx.exec(ser.ndk_rpc_addr);
                        if (match) {
                            server = match[1];
                        }
                        if(server==""){
                            var regx = /ChaosAgent_(.+)/;
                            var match = regx.exec(ser.instance_name);
                            if (match) {
                                server = match[1];
                            }
                        }
                    }
                    if(server!=""){
                    agent_obj[server] = {};
                    agent_obj[server]["ndk_uid"]=ser.instance_name;

                    jchaos.rmtListProcess(server + ":8071", function(r) {
                        if (r.hasOwnProperty("info")) {
                            agent_obj[server]['idle'] = r.info.hasOwnProperty("idletime") ? parseFloat(r.info.idletime) : parseFloat(r.info.idle);
                            agent_obj[server]['user'] = r.info.hasOwnProperty("usertime") ? parseFloat(r.info.usertime) : parseFloat(r.info.user);
                            agent_obj[server]['sys'] = r.info.hasOwnProperty("systime") ? parseFloat(r.info.systime) : parseFloat(r.info.sys);
                            agent_obj[server]['io'] = r.info.hasOwnProperty("iowait") ? parseFloat(r.info.iowait) : parseFloat(r.info.io);
                            agent_obj[server]['pmem'] = parseFloat(r.info.pmem);

                            agent_obj[server]['ts'] = r.info.ts;
                        }

                        if (r.data.hasOwnProperty("processes") && (r.data.processes instanceof Array)) {
                            var processes = r.data.processes;
                            processes.forEach(function(p) {
                                p['hostname'] = server;
                                p['parent'] = ser.instance_name;

                                proc[p.uid] = p;
                                proc_list.push(p.uid);
                            });
                        }
                        if (++cnt >= agl.length) {
                            tmpObj['data'] = proc;
                            tmpObj['elems'] = proc_list;
                            tmpObj['agents'] = agent_obj;
                            if (typeof cb === "function") {
                                cb(tmpObj);
                            }
                        }
                    }, function(bad) {
                        console.log("Some error state of server:" + server + " occur:" + bad);
                        if (++cnt >= agl.length) {
                            tmpObj['data'] = proc;
                            tmpObj['elems'] = proc_list;
                            tmpObj['agents'] = agent_obj;
                            if (typeof cb === "function") {
                                cb(tmpObj);
                            }
                        }
                    });
                }
                });

            }
            /**
             * findBestServer
             * return a list of agents ordered by occupation in the callback
             * NOTE: this function use a tcp port the is different from REST server one (it goes directly on the server)
             * @param {okcb} cb: return a list of active agents
             * @return {string} return the best server
             * @function findBestServer
             * @example
             * // find the best server to run a script:
             * jchaos.findBestServer(function(cb){jchaos.print(JSON.stringify(cb));})
             */
        jchaos.findBestServer = function(cb) {
            jchaos.activeAgentList(function(iagents) {
                jchaos.getAllProcessInfo(iagents, function(ag) {
                    var server = "";
                    var agentname="";
                    var idle = 0;
                    var agents = ag['agents'];
                    for (var i in agents) {
                        if ((agents[i]['idle'] > idle) || (agents[i]['idle'] ==0)) {
                            server = i;
                            agentname=agents[i]['ndk_uid']
                            idle = agents[i]['idle'];
                        }
                    }
                    cb(server,agentname);

                });
            })
        };

        /**
         * runScript
         * Run the specified script on the chaos infrastructure
         * @param {string} name the name of the script present in the DB
         * @param {object} [parm] optional parameters
         * @param {okcb} [okhandle]  called when ok
         * @param {badcb} [errorhandle] called when failed
         * @function runScript
         */
        jchaos.runScript = function(name, parm, okhandle, errorhandle) {
                jchaos.search(name, "script", false, function(l) {
                    if (l.hasOwnProperty('found_script_list') && (l['found_script_list'] instanceof Array)) {
                        if (l.found_script_list.length > 0) {
                            var seq = l.found_script_list[0].seq;
                            console.log("found script:" + JSON.stringify(l.found_script_list[0]));
                            jchaos.loadScript(name, seq, function(jsonscript) {
                                jchaos.findBestServer(function(server) {
                                    if (server == "") {
                                        if (typeof errorhandle === "function") {
                                            errorhandle("No server available");

                                        } else {
                                            throw "No Server Available";
                                        }
                                    }
                                    console.log("best server:" + server);

                                    jchaos.rmtUploadScript(server + ":8071", jsonscript, function(r) {
                                        if (r.err != 0) {
                                            if (typeof errorhandle !== "undefined") errorhandle(server + ": Load Script", "cannot load:" + r.errmsg);

                                        } else {
                                            if (r.data.hasOwnProperty('path')) {
                                                var path = r.data.path;
                                                var workingdir = r.data.workingdir;
                                                var launch_arg = "";
                                                var name = jsonscript['script_name'];
                                                var language = jsonscript['eudk_script_language'];
                                                var defargs = jsonscript['default_argument']
                                                var chaos_prefix = "";
                                                jchaos.rmtGetEnvironment(server + ":8071", "CHAOS_PREFIX", function(r) {
                                                    if (r.err != 0) {
                                                        if (typeof errorhandle !== "undefined") errorhandle("Cannot retrive environment", "cannot read CHAOS_PREFIX:" + r.errmsg);
                                                        return;
                                                    } else {
                                                        chaos_prefix = r.data.value;
                                                        if (language == "CPP") {
                                                            launch_arg = chaos_prefix + "/bin/chaosRoot --conf-file " + chaos_prefix + "/etc/chaos_root.cfg --rootopt \"-q " + path + parm + "\"";
                                                        } else if (language == "bash") {
                                                            launch_arg = "bash " + path + parm;
                                                        } else if (language == "nodejs") {
                                                            launch_arg = "node " + path + parm;

                                                        } else if (language == "python") {
                                                            launch_arg = "python " + path + parm;

                                                        } else {
                                                            launch_arg = language + " " + path + parm;
                                                        }
                                                        jchaos.rmtCreateProcess(server + ":8071", name, launch_arg, language, workingdir, function(r) {
                                                            console.log("Script running onto:" + server + " :" + JSON.stringify(r));
                                                            if (typeof okhandle !== "undefined") okhandle(r);
                                                        }, function(bad) {
                                                            console.log("Some error getting loading script:" + bad);
                                                            if (typeof errorhandle !== "undefined") errorhandle("Failed to start " + bad);

                                                        });


                                                    }
                                                }, function(bad) {
                                                    console.log("Some error getting environment:" + bad);
                                                    if (typeof errorhandle !== "undefined") errorhandle("Failed to start " + bad);

                                                });
                                            }

                                        }
                                    }, function(bad) {
                                        console.log("Some error  loading script:" + bad);
                                        if (typeof errorhandle !== "undefined")
                                            errorhandle("Exception  loading:" + bad);

                                    });
                                });
                            });
                        }

                    };
                });
            }
            /**
             * Encode a path name
             * removes trailing 
             * @param  {string} str string to encode
             * @return {string} encoded string
             * @function encodeName
             */

        jchaos.encodeName = function(str) {
            var tt = str.replace(/[\/\:\.\)\(,]/g, "_");
            var rr = tt.replace(/\+/g, "_p");
            var kk = rr.replace(/\-/g, "_m")
            return kk;
        }

        /**
         * This function used mainly in tests.
         * It checks for a variable change on a 'devlist', for 'retry' times, checking every 'checkFreq'
         * 'checkFunc' takes in input the live and realize the check 
         * okhandle is called if success
         * nokhandle if fails
         * @param  {string} str string to display when the check is peformed
         * @param  {string[]} devlist list of CU to check
         * @param  {integer} retry retry the ckeck for the given number of times
         * @param  {integer} checkFreq check frequency expressed in ms
         * @param  {okcb} checkFunc call back to call that perform the check, it takes in input the dataset to check, should return true if the check succeed or false if not
         * @param  {okcb} okhandle callback to call if the test complete successfully
         * @param  {badcb} nokhandle callback to call if the test fails
         * @function checkLive
         * @example
         * // check if the list of CUs are in start
         *  var cu_status=["BTF/QUADRUPOLE/QUATB001","BTF/QUADRUPOLE/QUATB002","BTF/QUADRUPOLE/QUATB003"];
         *  jchaos.checkLive('check Start',cu_status, 20, 1000, function (ds) {jchaos.print("testing..."); return (ds!=null)&&ds.hasOwnProperty("health")&&ds.health.hasOwnProperty("nh_status")&&(ds.health.nh_status == "Start"); }, function () { jchaos.print("CHECK OK"); }, function () { jchaos.error("CHECK FAILED"); });
         */
        jchaos.checkLive = function(str, devlist, retry, checkFreq, checkFunc, okhandle, nokhandle) {
            var tot_ok = 0;
            //console.log(" checking Live of " + devlist + " every:" + checkFreq + " ms");
            jchaos.getChannel(devlist, -1, function(ds) {
                var cnt = 0;
                ds.forEach(function(elem) {
                    if (elem.hasOwnProperty("health") && elem.health.hasOwnProperty("ndk_uid")) {
                        if (checkFunc(elem)) {
                            tot_ok++;
                            console.log("\x1B[1m" + str + "\x1B[1m\t\x1B[32m\x1B[1mOK\x1B[22m\x1B[39m \x1B[1m" + elem.health.ndk_uid + "\x1B[22m " + tot_ok + "/" + devlist.length);

                        } else {
                            if (retry > 1) {
                                console.log("\x1B[1m" + str + "\x1B[1m\t-" + retry + "- \x1B[33m\x1B[1m" + elem.health.ndk_uid + "\x1B[22m\x1B[39m " + tot_ok + "/" + devlist.length);
                            } else {
                                console.log("\x1B[1m" + str + "\x1B[1m\t-" + retry + "- \x1B[31m\x1B[1m" + elem.health.ndk_uid + "\x1B[22m\x1B[39m " + tot_ok + "/" + devlist.length);
                            }
                        }
                    } else {
                        if (retry > 1) {
                            console.log("\x1B[1m" + str + "\x1B[1m\t-" + retry + "- \x1B[33m\x1B[1m missing/malformed health " + devlist[cnt] + "\x1B[22m\x1B[39m " + tot_ok + "/" + devlist.length);
                        } else {
                            console.log("\x1B[1m" + str + "\x1B[1m\t-" + retry + "- \x1B[31m\x1B[1m missing/malformed health " + devlist[cnt] + "\x1B[22m\x1B[39m " + tot_ok + "/" + devlist.length);
                        }
                    }
                    cnt++;
                });
            }, function() {
                console.log(str + " getChannel failed " + retry);

                if (tot_ok == devlist.length) {
                    okhandle();
                    return;
                }
            });

            setTimeout(function() {
                if (tot_ok == devlist.length) {
                    okhandle();
                    return;
                } else if (--retry > 0) {
                    console.log(str + " retry check... " + retry);

                    jchaos.checkLive(str, devlist, retry, checkFreq, checkFunc, okhandle, nokhandle);
                } else {
                    console.log(str + " expired maximum number of retry...");

                    nokhandle();
                }
            }, checkFreq);
        }
        return jchaos;
    }
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {


        module.exports = createLibrary();

    } else {

        window.jchaos = createLibrary();

    }
}).call(this);