/**
 * !CHAOS REST Library
 */

(function () {
	function createLibrary() {
		var jchaos = {};

		jchaos.ops_on_going = 0;
		jchaos.ops_abort = false;
		jchaos.lastChannel = {};
		jchaos.options = {
			updateEachCall: false,
			uri: "localhost",
			async: true,
			limit_on_going: 10000,
			history_page_len: 1000,
			console_log: function (str) { console.log(str); },
			console_err: function (str) { console.error(str); }

		};
		jchaos.setOptions = function (opt) {
			for (var attrname in opt) { jchaos.options[attrname] = opt[attrname]; }
			var str = jchaos.options['uri'];
			var regex = /\:\d+/;
			//strip eventual port
			jchaos.options['uri'] = str.replace(regex, "");


		}
		jchaos.print = function (str) {
			jchaos.options['console_log'](str);
		}
		jchaos.perror = function (str) {
			jchaos.options['console_err'](str);
		}
		jchaos.basicPost = function (func, params, handleFunc, handleFuncErr) {
			var request;
			if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
				XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
			}
			request = new XMLHttpRequest();
			var url = "http://" + jchaos.options.uri + ":8081/" + func;
			var could_make_async = (typeof handleFunc === "function");
			if (could_make_async == false) {
				request.open("POST", url, false);
				request.send(params);
				if (request.status == 200) {
					try {
						var json = JSON.parse(request.responseText);
						return json;
					} catch (err) {
						var str = "jchaos.basicPost Error parsing json '" + err + "' body returned:'" + request.responseText + "' post:'" + params + "'";
						console.error(str);
						return null;
					}
				}
				console.error("bad status:" + request.status);
				return null;

			}
			request.open("POST", url, (jchaos.ops_on_going > jchaos.options.limit_on_going) ? false : (jchaos.options.async));
			// console.log("on going:"+jchaos.ops_on_going);
			// request.setRequestHeader("Content-Type", 'application/json');
			jchaos.ops_on_going++;
			request.onreadystatechange = function (e) {

				//console.log("answer:"+request.status + " state:"+request.readyState);
				if (request.readyState == 4) {
					jchaos.ops_on_going--;
					if (request.status == 200) {
						try {
							var json = JSON.parse(request.responseText);
							if (could_make_async) {
								try {
									handleFunc(json);
								} catch (err) {
									console.trace("trace:");
									var str = "handler function error:'" + err + "' url:'" + url + "' post data:'" + params + "' response:'" + request.responseText + "'";
									console.log(str);
								}
							}
							return json;

						} catch (err) {
							var str = "jchaos.basicPost Error parsing json '" + err + "' body returned:'" + request.responseText + "'" + "' post:'" + params + "'";;
							//console.error(str);
							console.log(str);
							//throw str;
							if (handleFuncErr != null && (typeof handleFuncErr === "function")) {
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
						var str = "POST " + url + " body:\"" + params + "\" went wrong, result:" + request.status + " state:" + request.readyState;
						console.error(str);
						if (handleFuncErr != null && (typeof handleFuncErr === "function")) {
							handleFuncErr(request.responseText);
						}
					}
				}

			}
			request.onerror = function (e) {
				console.error("request error:" + request.statusText);
				//throw "error:" + request.statusText;
			};
			//console.log("sending:"+params);
			request.send(params);

			//  request.close();

		}
		jchaos.addLongKey = function (obj, key, valuestr) {
			if (obj[key] == undefined) {
				var tt = {}
				tt['$numberLong'] = valuestr;
				obj[key] = tt;
			}
		}
		jchaos.getLongLong = function (obj, key) {
			return parseInt(obj[key].$numberLong);
		}
		jchaos.setLongLong = function (obj, key, val) {
			if (!obj.hasOwnProperty(key)) {
				jchaos.addLongKey(obj, key, val.toString());
				return;
			}

		}
		jchaos.normalizeDataset = function (obj) {
			jchaos.addLongKey(obj, 'dpck_hr_ats', "0");
			jchaos.addLongKey(obj, 'dpck_ats', "0");
			jchaos.addLongKey(obj, 'dpck_seq_id', "0");
		}

		jchaos.registerCU = function (cuid, obj, handleFunc) {
			var str_url_cu = "/api/v1/producer/jsonregister/" + cuid;
			var dd = Date.now();
			jchaos.normalizeDataset(obj);
			jchaos.basicPost(str_url_cu, JSON.stringify(obj), handleFunc);
		}

		jchaos.pushCU = function (cuid, obj, handleFunc) {
			var str_url_cu = "/api/v1/producer/jsoninsert/" + cuid;
			var dd = Date.now();
			jchaos.setLongLong(obj, 'dpck_seq_id', jchaos.getLongLong(obj, 'dpck_seq_id') + 1);
			-                       jchaos.setLongLong(obj, 'dpck_ats', dd);
			jchaos.setLongLong(obj, 'dpck_hr_ats', dd * 1000);

			if (typeof handleFunc !== "function") {
				jchaos.basicPost(str_url_cu, JSON.stringify(obj), null);
				return;

			}

			jchaos.basicPost(str_url_cu, JSON.stringify(obj), function (datav) { handleFunc(datav); });

		}
		jchaos.mdsBase = function (cmd, opt, handleFunc, errFunc) {
			var param = "cmd=" + cmd + "&parm=" + JSON.stringify(opt);
			var ret = jchaos.basicPost("MDS", param, handleFunc, errFunc);
			return ret;
		}
		/**
		 * Start tagging a list of nodes for an interval of given time, expressed in cycles or ms
		 * @param {*} _tagname tag name
		 * @param {*} _node_list a list of nodes
		 * @param {*} _tag_type 1 means cycles 2 means ms time
		 * @param {*} _tag_value tag value
		 */
		jchaos.tag = function (_tagname, _node_list, _tag_type, _tag_value, handleFunc, nok) {
			var value = {};
			value['dsndk_history_burst_tag'] = _tagname;
			value['dsndk_history_burst_type'] = _tag_type;
			value['dsndk_history_burst_value'] = _tag_value;

			if (_node_list instanceof Array) {
				value['ndk_uid'] = _node_list;
			} else {
				value['ndk_uid'] = [_node_list];
			}
			return jchaos.snapshot("", "burst", "", JSON.stringify(value), handleFunc, nok);
		}
		jchaos.snapshot = function (_name, _what, _node_list, value_, handleFunc, nok) {
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

			try {
				//JSON.parse(value_);
				opt['value'] = JSON.parse(value_);

			} catch (e) {

			}

			return jchaos.mdsBase("snapshot", opt, handleFunc, nok);
		}

		/*get a US description
		 * */
		jchaos.getUS = function (_name) {
			var ret = jchaos.node(_name, "get", "us", "", "", null);
			return ret;
		}
		/*get a US description
		 * */
		jchaos.setUS = function (_name, _json) {
			var ret = jchaos.node(_name, "set", "us", "", _json, null);
			return ret;
		}
		jchaos.node = function (_name, _what, _type, _parent, value_, handleFunc, nok) {
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
			opt['parent'] = _parent;


			if (value_ != null) {
				try {
					JSON.stringify(value_); // check if json
					opt['value'] = value_;
					console.log("param:" + JSON.stringify(opt));
				} catch (e) {
					console.error("not a valid json error :'" + e + "' value:" + value_);
					return;
				}
			}
			return jchaos.mdsBase("node", opt, handleFunc, nok);
		}

		jchaos.loadScript = function (_name, seqid, handleFunc) {
			var opt = {};
			var value = {
				"seq": seqid,
				"script_name": _name
			};
			opt['name'] = "";
			opt['what'] = "load";
			opt['value'] = value;
			return jchaos.mdsBase("script", opt, handleFunc);
		}
		jchaos.manageInstanceScript = function (script_name, script_seq, instance_name, create, handleFunc) {
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
		jchaos.saveScript = function (value, handleFunc) {
			var opt = {};

			opt['name'] = "";
			opt['what'] = "save";
			opt['value'] = value;
			return jchaos.mdsBase("script", opt, handleFunc);
		}
		jchaos.rmScript = function (value, handleFunc) {
			var opt = {};

			opt['name'] = "";
			opt['what'] = "del";
			opt['value'] = value;
			return jchaos.mdsBase("script", opt, handleFunc);
		}
		jchaos.searchScriptInstance = function (script_name, search_string, handleFunc) {
			var opt = {};
			var script_desc = {};
			script_desc['script_name'] = script_name;
			script_desc['search_string'] = search_string;

			opt['name'] = "";
			opt['what'] = "searchInstance";
			opt['value'] = script_desc;
			return jchaos.mdsBase("script", opt, handleFunc);
		}
		jchaos.updateScriptInstance = function (script_instance, script_base_description, handleFunc) {
			var opt = {};
			var script_desc = {};
			script_desc['script_instance'] = script_instance;
			script_desc['script_base_description'] = script_base_description;

			opt['name'] = "";
			opt['what'] = "bind";
			opt['value'] = script_desc;
			return jchaos.mdsBase("script", opt, handleFunc);
		}
		jchaos.variable = function (_name, _what, value_, handleFunc) {
			var opt = {};
			if (_name instanceof Array) {
				opt['names'] = _name;
			} else {
				opt['name'] = _name;
			}
			opt['what'] = _what;
			if (_what == "set") {
				try {
					if (!(value_ instanceof Object)) {
						JSON.parse(param);

					}
					JSON.parse(value_);
					opt['value'] = JSON.stringify(value_);

				} catch (e) {
					opt['value'] = value_;
				}
			}

			return jchaos.mdsBase("variable", opt, handleFunc);
		}

		jchaos.log = function (_name, _what, _type, _start, _end, handleFunc) {
			var opt = {};
			if (_name instanceof Array) {
				opt['names'] = _name;
			} else {
				opt['name'] = _name;
			}
			opt['what'] = _what;
			opt['type'] = _type;
			opt['start'] = _start;
			opt['end'] = _end;

			return jchaos.mdsBase("log", opt, handleFunc);
		}
		/**
		 * 
		 * @param {string} _name is the substring of what you want search
		 * @param {string} _what is one of "cu,us"
		 * @param {boolean} _alive search among alive (true) or all(false)
		 * @param {*} handleFunc handler
		 */
		jchaos.search = function (_name, _what, _alive, handleFunc) {

			var opt = {
				name: _name,
				what: _what,
				alive: _alive
			};
			var optv = {
				names: _name,
				what: _what,
				alive: _alive
			};
			if (_name instanceof Array) {
				return jchaos.mdsBase("search", optv, handleFunc);
			}
			return jchaos.mdsBase("search", opt, handleFunc);
		}
		/**
		 * Find an array of CU with the given implementation
		 * @param {string} impl C++ implementation name to find
		 * @param {bool} alive search from alive or all
		 * @param {function} handleFunc call back function
			 
		 }}
		 */
		jchaos.findCUByImplementation = function (impl, alive, handleFunc) {
			var implList = [];
			jchaos.search("", "cu", alive, function (lscu) {
				jchaos.getDesc(lscu, function (desclist) {
					desclist.forEach(function (elem) {
						if (String(elem.instance_description.control_unit_implementation).includes(impl)) {
							implList.push(elem.ndk_uid);
						}
					});
					handleFunc(implList);
				});
			});
		}
		/**
		 * Recover CU alive status
		 * @ param {String} status_to_search Status to find (Start, Stop, Init, Deinit, Fatal error, Recoverable error)
		 * @ param {List} 
		 */
		jchaos.getCUStatus = function (status_to_search, handleFunc) {
			var cu_stats = [];
			var cu_to_search = [];
			var cnt = 0;
			jchaos.search("", "cu", false, function (data) {
				cu_to_search = data;
				jchaos.getChannel(cu_to_search, 4, function (ds) {
					//	console.log("status:"+JSON.stringify(ds));
					ds.forEach(function (elem) {
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
		jchaos.convertArray2CSV = function (devs) {
			var dev_array = "";
			if (devs instanceof Array) {
				devs.forEach(function (elem, i, array) {
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

		jchaos.getChannel = function (devs, channel_id, handleFunc, badfunc) {

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
			jchaos.basicPost("CU", str_url_cu, function (datav) { jchaos.lastChannel = datav; handleFunc(datav); }, badfunc);
		}
		jchaos.getDesc = function (devs, handleFunc) {

			var dev_array = jchaos.convertArray2CSV(devs);

			if (dev_array == "") {
				handleFunc([{}]);
				return;
			}
			var str_url_cu = "dev=" + dev_array + "&cmd=desc";
			//	console.log("query:"+str_url_cu);
			if ((typeof handleFunc !== "function")) {
				return jchaos.basicPost("CU", str_url_cu, null);
			}
			jchaos.basicPost("CU", str_url_cu, function (datav) { jchaos.lastChannel = datav; handleFunc(datav); });
		}
		jchaos.setSched = function (cu, schedule_ms) {
			return jchaos.sendCUCmd(cu, "sched", Number(schedule_ms));
		}
		jchaos.setBypass = function (dev, value, handleFunc) {
			var opt = {
				"name": dev,
				"type": "cu",
				"what": "set",
				"value": { "properties": [{ "cudk_bypass_state": value }] }
			};
			return jchaos.mdsBase("node", opt, handleFunc);
		}
		jchaos.setProperty = function (dev, prop, handleFunc, errFunc) {
			var opt = {
				"name": dev,
				"type": "cu",
				"what": "set",
				"value": { "properties": prop }
			};
			return jchaos.mdsBase("node", opt, handleFunc, errFunc);
		}
		jchaos.loadUnload = function (dev, value, handleFunc, nok) {

			var opt = {

				"type": "cu",
				"what": value ? "load" : "unload",
			};
			if (dev instanceof Array) {
				opt['names'] = dev;
			} else {
				opt['name'] = dev;
			}
			jchaos.mdsBase("node", opt, handleFunc, nok);
		}
		jchaos.forceState = function (devs, state, handleFunc) {
			jchaos.getChannel(devs, 4, function (data) {
				data.forEach(function (elem) {
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
									jchaos.sendCUCmd(cuname, "init", "", function (d) {
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
									jchaos.sendCUCmd(cuname, "init", "", function (handleFunc) {
										jchaos.sendCUCmd(cuname, "start", "", function (handleFunc) {
											jchaos.sendCUCmd(cuname, "stop", "", handleFunc);
										});

									});
									break;
								case "Init":
									jchaos.sendCUCmd(cuname, "start", "", function (handleFunc) {
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
									jchaos.sendCUCmd(cuname, "stop", "", function (handleFunc) {
										jchaos.sendCUCmd(cuname, "deinit", "", handleFunc);
									});

									break;
							}
						} else if (state == "Init") {
							switch (custate) {
								case "Stop":
									jchaos.sendCUCmd(cuname, "deinit", "", function (handleFunc) {
										jchaos.sendCUCmd(cuname, "init", "", handleFunc);
									});
									break;
								case "Deinit":
									jchaos.sendCUCmd(cuname, "init", "", handleFunc);
									break;
								case "Start":
									jchaos.sendCUCmd(cuname, "stop", "", function (handleFunc) {
										jchaos.sendCUCmd(cuname, "deinit", "", function (handleFunc) {
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
		jchaos.setAttribute = function (devs, attr, value, ok, nok) {
			//var parm="{\""+attr+"\":\""+value+"\"}";
			var parm = {};
			parm[attr] = value;
			jchaos.sendCUCmd(devs, "attr", parm, ok, nok);
		}

		/*
		 * Send a command to a set of devices
		 * 
		 * */
		jchaos.sendCUCmd = function (devs, cmd, param, handleFunc, handleFuncErr) {
			jchaos.sendCUFullCmd(devs, cmd, param, 0, 0, handleFunc, handleFuncErr);
		}
		jchaos.sendCUFullCmd = function (devs, cmd, param, force, prio, handleFunc, handleFuncErr) {
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
				params = JSON.stringify(param);
			} catch (e) {
				params = param;

			}
			var str_url_cu = "dev=" + dev_array + "&cmd=" + cmd + "&mode=" + force + "&prio=" + prio;
			if (params != "") {
				str_url_cu = str_url_cu + "&parm=" + params;
			}
			if ((typeof handleFunc !== "function")) {
				return jchaos.basicPost("CU", str_url_cu, null);
			}
			jchaos.basicPost("CU", str_url_cu, handleFunc, handleFuncErr);
		}
		/**
		 * 
		 * @param {string} devs 
		 * @param {integer} channel 
		 * @param {epoch timestamp in ms} start 
		 * @param {epoch timestamp in ms} stop 
		 * @param {string variable name optional} varname 
		 * @param {handler} handleFunc
		 * @param {string[] tags optional} tagsv 

		 */
		jchaos.getHistory = function (devs, channel, start, stop, varname, handleFunc, tagsv) {
			var result = {
				X: [],
				Y: []
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
				opt['tags'] = tagsv;
			}

			opt['channel'] = channel;
			opt['page'] = jchaos.options.history_page_len;
			if (varname !== "undefined" && (typeof varname !== "string")) {
				opt['var'] = varname;
			}
			if (tagsv !== "undefined") {
				if (tagsv instanceof Array) {
					opt["tags"] = tagsv;
				} else {
					opt["tags"] = [tagsv];

				}
			}

			jchaos.getHistoryBase(devs, opt, 1, 0, result, handleFunc);

		}

		jchaos.fetchHistoryToZip = function (zipname, cams, start, stop, tagsv, updateCall) {
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
			updateCall(
				{
					percent: per
				});
			vcams.forEach(function (ci) {
				jchaos.getHistory(ci, 0, start, stop, "", function (ds) {
					if (ds.Y[0].hasOwnProperty("FRAMEBUFFER") && ds.Y[0].FRAMEBUFFER.hasOwnProperty("$binary") && ds.Y[0].hasOwnProperty("FMT")) {
						ds.Y.forEach(function (img) {

							var name = ci + "/" + img.dpck_seq_id + "_" + img.dpck_ats + "_" + img.FMT;
							zipf.file(name, img.FRAMEBUFFER.$binary.base64, { base64: true });
							console.log("zipping image: " + name + " into:" + zipname);

						});
					} else {
						var name = ci + ".json";
						zipf.file(name, JSON.stringify(ds.Y));
						console.log("zipping dataset: " + name + " into:" + zipname);
					}


					if (--cnt == 0) {
						zipf.generateAsync({ type: "blob" }, updateCall).then(function (content) {
							saveAs(content, zipname);
						});
					}
				}, tagsv);
			});


		}

		jchaos.getHistoryBase = function (devs, opt, seq, runid, result, handleFunc) {
			var cmd = "queryhst";
			var dev_array = jchaos.convertArray2CSV(devs);

			opt['seq'] = seq;
			opt['runid'] = runid;

			var str_url_cu = "dev=" + dev_array + "&cmd=" + cmd + "&parm=" + JSON.stringify(opt);
			console.log("getHistory (seqid:" + seq + " runid:" + runid + ") start:" + opt.start + " end:" + opt.end + " page:" + opt.page);
			jchaos.basicPost("CU", str_url_cu, function (datav) {
				var ret = true;
				if ((opt.var != null) && (opt.var != "")) {
					datav.data.forEach(function (ele) {
						result.X.push(Number(ele.ts));
						result.Y.push(ele.val);
					});
				} else {
					datav.data.forEach(function (ele) {
						result.X.push(Number(ele.dpck_ats));
						result.Y.push(ele);
					});

				}
				if (jchaos.options.updateEachCall) {
					ret = handleFunc(result);
					result.X = [];
					result.Y = [];
				} else {
					if (datav.end == 1) {
						// update if 0 or something else
						handleFunc(result);

					}
				}
				if (ret && (datav.end == 0)) {
					jchaos.getHistoryBase(devs, opt, datav.seqid, datav.runid, result, handleFunc);
				}
			});
		}



		jchaos.checkPeriodiocally = function (str, retry, checkFreq, checkFunc, okhandle, nokhandle) {
			setTimeout(function () {
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
		 * This function check for a variable change on a 'devlist', for 'retry' times, checking every 'checkFreq'
		 * 'checkFunc' takes in input the live and realize the check 
		 * okhandle is called if success
		 * nokhandle if fails
		 * */

		jchaos.checkLive = function (str, devlist, retry, checkFreq, checkFunc, okhandle, nokhandle) {
			var tot_ok = 0;
			//console.log(" checking Live of " + devlist + " every:" + checkFreq + " ms");
			jchaos.getChannel(devlist, -1, function (ds) {
				var cnt = 0;
				ds.forEach(function (elem) {
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
			}, function () {
				console.log(str + " getChannel failed " + retry);

				if (tot_ok == devlist.length) {
					okhandle();
					return;
				}
			});

			setTimeout(function () {
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
