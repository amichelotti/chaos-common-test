var assert = require('assert');
//var assert = require('chai').assert;

var jchaos = require('jchaos.js');
options = {};

process.argv.forEach(function (val, index, array) {

	if (val == "uri") {
		options.uri = array[index + 1];
		console.log(val + "=" + array[index + 1]);
	}
	if (val == "async") {
		options.async = (array[index + 1] == "true");
		console.log(val + "=" + array[index + 1]);
	}
	if (val == "npush") {
		npush = (array[index + 1]);
		console.log(val + "=" + array[index + 1]);
	}
});

var cualive = [];
var status_to_check = ["Start", "Stop", "Init", "Deinit", "Fatal Error", "Recoverable Error"];
var cualive_by_status = [];

var cualive_ds = [];
var cu_all = [];
var class_alive = [];
var class_all = [];
var zone_alive = [];
var zone_all = [];
jchaos.setOptions(options);

describe("CHAOS LIVE TESTS", function () {
	this.timeout(60000);

	describe('SEARCH', function () {

		it('SEARCH ALIVE CU array not null array of names', function (done) {
			jchaos.search("", "cu", true, function (data) {
				cualive = data;
				done(data.length <= 0);


			});
		})
		it('SEARCH ALL CU greater ALIVE cu', function (done) {
			jchaos.search("", "cu", false, function (data) {
				cu_all = data;
				done(cu_all.length > cualive.lenght);

			});
		})
		it('SEARCH CLASS ALIVE array not null array of names', function (done) {
			jchaos.search("", "class", true, function (data) {
				class_alive = data;
				done(class_alive.length <= 0);

			});
		})
		it('SEARCH CLASS ALL array not null array of names', function (done) {
			jchaos.search("", "class", false, function (data) {
				class_all = data;
				done(class_all.length <= 0);

			});
		})

		it('SEARCH ZONE ALIVE array not null array of names', function (done) {
			jchaos.search("", "zone", true, function (data) {
				zone_alive = data;

				done(zone_alive.length <= 0);

			});
		})
		it('SEARCH ZONE ALL array not null array of names', function (done) {
			jchaos.search("", "zone", false, function (data) {
				zone_all = data;

				done(zone_all.length <= 0);


			});
		})

		after(function () {
			console.log("\tALIVE CU      :" + cualive.length);
			console.log("\tALL CU        :" + cu_all.length);
			console.log("\tALIVE CLASSES :" + class_alive);
			console.log("\tALIVE ZONE    :" + zone_alive);


		});
	});

	function checkFinish(done) {
		if (ndone > 0)
			done();
	}

	describe('LIVE TEST', function () {
		this.timeout(60000);

		it('all live dataset should be valid', function () {
			cualive.forEach(function (elem) {
				describe('[' + elem + '] LIVE DATESET', function (done) {
					this.timeout(60000);
					it('[' + elem + '] should retrive a valid DATASET', function (done) {
						jchaos.getChannel(elem, -1, function (data) {
							var ds = JSON.stringify(data[0]);
							try {
								JSON.parse(ds);
							} catch (err) {
								console.error("error: '" + err + "' parsing:'" + ds + "'");
								done(true);
								return;
							}

							var sys = JSON.stringify(data[0].system);
							var healt = JSON.stringify(data[0].health);
							var out = JSON.stringify(data[0].output);
							//var input=JSON.stringify(data[0].input);
							// system and health should be present
							//	console.log("\tsystem:"+sys);
							//console.log("\thealth:"+healt);
							//	console.log("\tinput:"+input);
							//	console.log("\toutput:"+out);
							done((ds.length < 2) || (sys.length < 2) || (healt.length < 2) || (out.length < 2));
						});

					});
				});
			});

		});
		it('GET FULL LIVE STATUS', function (done) {
			jchaos.getChannel(cualive, -1, function (data) {
				cualive_ds = data;
				var check = JSON.stringify(data);
				done((check.length < 2) || (data.length != cualive.length));
			});
		});
		it('RETRIVE CU status', function () {

			status_to_check.forEach(function (elem) {
				describe('Retriving all CU in \"' + elem + '\" status', function (done) {
					this.timeout(60000);

					it('checking CU in "' + elem + '" status', function (done) {
						var cus = jchaos.getCUStatus(elem, function (ll) {
							cualive_by_status[elem] = ll;
							console.log("\tCU in '" + elem + "':" + cualive_by_status[elem]);
							done(!(ll instanceof Array));
						});
					});
				});
			});

		});
		it('check for bypass key', function () {
			cualive_ds.forEach(function (elem) {

				var check = JSON.stringify(elem.system);
				if (elem.hasOwnProperty('system') && elem.hasOwnProperty('health')) {

					if (elem.system.hasOwnProperty('cudk_bypass_state') == false) {
						console.log("\tmissing bypass key in \"" + JSON.stringify(elem.health.ndk_uid) + "\" all:" + JSON.stringify(elem.system));
					}
					if ((elem.health.nh_status == "Start")) {
						assert.ok(elem.system.hasOwnProperty('cudk_bypass_state'), " cudk_bypass_state not present in " + JSON.stringify(elem));
					}
				}
			});
			assert.ok(true);

		});
		it('check for bypass command set TRUE', function (done) {
			// make it on started CU
			var cu_in_start = [];
			jchaos.getCUStatus("Start", function (ll) {
				cu_in_start = ll;
				cu_in_start.forEach(function (elem) {
					//	console.log("\t ["+elem+"] set bypass false");
					jchaos.setBypass(elem, true, function (d) { });

				});
				jchaos.checkLive(cu_in_start, 10, 2000, function (ds) { return (ds.system.cudk_bypass_state == false); }, function () { done(0); }, function () { done(1); });

			});
			/*	setTimeout(function(){
					jchaos.getChannel(cu_in_start,3,function(data){
						var some_error=0;
						data.forEach(function(elem){
							//	console.log("=====>" + JSON.stringify(elem));
							if(elem.cudk_bypass_state != true){
								console.error("\t["+elem.ndk_uid+"] bypass not set to 'true' "+ JSON.stringify(data[0]));
								some_error++;
							} else{
								//console.log("\t["+elem.ndk_uid+"] setting bypass TRUE ok ");
							}
						});
						done(some_error);
					});
				},2000);
	*/
		});
		it('check for bypass command set FALSE', function (done) {
			// make it on started CU
			var cu_in_start = [];
			jchaos.getCUStatus("Start", function (ll) {
				cu_in_start = ll;
				cu_in_start.forEach(function (elem) {
					//	console.log("\t ["+elem+"] set bypass false");
					jchaos.setBypass(elem, false, function (d) { });

				});
				jchaos.checkLive(cu_in_start, 10, 2000, function (ds) { return (ds.system.cudk_bypass_state == false); }, function () { done(0); }, function () { done(1); });

			});

			/*	setTimeout(function(){
					jchaos.getChannel(cu_in_start,3,function(data){
						var some_error=0;
						data.forEach(function(elem){
							//	console.log("=====>" + JSON.stringify(elem));
							if(elem.cudk_bypass_state != false){
								console.error("\t["+elem.ndk_uid+"] bypass not set to 'false' "+ JSON.stringify(data[0]));
								some_error++;
							} else{
								//	console.log("\t["+elem.ndk_uid+"] setting bypass FALSE ok ");
							}
						});
						done(some_error);
					});
				},2000);
	*/
		});

		it('check for health updates every 5s', function (done) {
			// make it on started CU
			var cu_in_start = [];
			jchaos.getCUStatus("Start", function (ll) {
				cu_in_start = ll;
				cu_timestamp = [];
				cu_new_timestamp = [];

				//	console.log("\t ["+elem+"] set bypass false");
				jchaos.getChannel(cu_in_start, 4, function (data) {
					//console.log("\t ["+cu_in_start+"] :"+JSON.stringify(data));

					data.forEach(function (elem) {
						//	console.log("\t ->"+Number(elem.nh_ts)+ " string:"+elem.nh_ts);
						cu_timestamp.push(Number(elem.nh_ts));
					});
				});

			});
			setTimeout(function () {
				var some_error = 0;
				jchaos.getChannel(cu_in_start, 4, function (data) {
					data.forEach(function (elem) {
						cu_new_timestamp.push(Number(elem.nh_ts));
					});
					for (var i = 0; i < cu_new_timestamp.length; i++) {
						if (cu_new_timestamp[i] - cu_timestamp[i] < 5000) {
							console.error("\t difference " + cu_new_timestamp[i] + " - " + cu_timestamp[i] + " < 5000");
							some_error++;
						} else {
							//	console.log("\t difference "+(cu_new_timestamp[i] - cu_timestamp[i]));

						}
					}
					done(some_error);

				});
			}, 10000);

		});
	});

	/*
		describe('STATUS Transition Test ',function(){
			this.timeout(60000);
			it('check Start->Stop',function(done){
				var cu_in_start=[];
				var cu_in_stop=[];
				jchaos.getCUStatus("Start",function(ll){
					console.log("N. CU in Start:"+ll.length);
					cu_in_start=ll;
					if(ll.length==0)
						done();
					jchaos.forceState(cu_in_start,"Stop",function(d){
						d.forEach(function(elem){
							if(elem.health.nh_status != "Stop"){
								assert.ok(false," Transition Start->Stop of "+elem.health.ndk_uid + " failed state is '"+elem.health.nh_status+"'" );
							}
						});
						done();
					});
				});
				setTimeout(function(){
					var some_error=0;
					jchaos.getChannel(cu_in_start,4,function(data){
						data.forEach(function(elem){
							if(elem.health.nh_status != "Stop"){
								some_error++;
								console.error(" Transition Start->Stop of "+elem.health.ndk_uid + " failed state is '"+elem.health.nh_status+"'" );
							}				
						});
	
						done(some_error);
	
					});
				},2000);
			});
	
		});
	*/
});	
