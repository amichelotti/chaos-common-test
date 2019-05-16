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
	this.timeout(1200000);

	describe('SEARCH', function () {
		it('SEARCH ALL CU (must be not empty)', function (done) {
			jchaos.search("", "cu", false, function (data) {
				cu_all = data;
				jchaos.getChannel(cu_all, 4,null);
				// get channel to initialize live caches
				jchaos.search("", "cu", true, function (cual) {
					console.log("\t checking channel of #CU:" + cual.length);
					done(data.length <= 0);

					jchaos.getChannel(cual, 4,function (ll) {
						console.log("\t ok channel 4:" + ll.length);

					},function(ll){
						console.log("\t not ready channel 4:" + ll.length);

					});
				});
			});


		});
		it('SEARCH ALIVE CU (must be less ALL CU)', function (done) {
			jchaos.search("", "cu", true, function (data) {
				cualive = data;
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
		this.timeout(1200000);
		var cu_in_start = [];
		
			// make it on started CU
		it('RETRIVE CU IN START', function (done) {
			console.log("Waiting 10s");

			setTimeout(function(){

			jchaos.getCUStatus("Start", function (ll) {
			    cu_in_start = ll;
			    console.log("CU status START:"+ll.length);
			    done((ll.length<1));
			    
			},function(){
			    console.log("CU status START: ERROR occurred");
			    done(1);
			});
			},10000);
		});
		it('Test all datasets',function(done){
			jchaos.checkLive('Live check',cu_in_start, 20, 2000, function (ds) {
				var ret=false;
			//	console.log("syslen:"+JSON.stringify(ds.system).length+ " healt len:"+JSON.stringify(ds.health).length+" outlen:"+JSON.stringify(ds.output).length); 
				if(typeof(JSON.stringify(ds.system))=='undefined'){
					console.log(ds.health.ndk_uid,": SYSTEM Undefined");
				}
				if(typeof(JSON.stringify(ds.health))=='undefined'){
					console.log(ds.system.ndk_uid,": HEALTH Undefined");
				}
				if(typeof(JSON.stringify(ds.output))=='undefined'){
					console.log(ds.health.ndk_uid,": OUTPUT Undefined");
				}
				try{
					ret=((JSON.stringify(ds.system).length >= 2) && (JSON.stringify(ds.health).length >= 2) && (JSON.stringify(ds.output).length >= 2));
				} catch(err){
				}
				return ret; }, function () { done(0); }, function () { done(1); });
		
		});
			
		it('GET FULL LIVE STATUS', function (done) {
			jchaos.getChannel(cualive, -1, function(ll){
				cualive_ds=ll;
				var check = JSON.stringify(cualive_ds);
				done(!((check.length >= 2) && (cualive_ds.length == cualive.length)));
			});
			
		});
		
		
		describe('Bypass Test', function(){
			it('check for bypass key', function () {
				this.timeout(60000);
	
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
			it('bypass command set TRUE', function (done) {
				this.timeout(60000);
	
				// make it on started CU
				var num=0;
				jchaos.setBypass(cu_in_start, true, function(d){
					done(false);
				});
				/* cu_in_start.forEach(function (elem) {
					//	console.log("\t ["+elem+"] set bypass false");
					jchaos.setBypass(elem, true, function(d){
						num++;
						if(num==cu_in_start.length){
							done(false);
						}
					});

				});		 */
			});
			it('check for bypass command set TRUE', function (done) {
				this.timeout(60000);
				jchaos.checkLive('check for bypass command set TRUE',cu_in_start, 20, 2000, function (ds) { return (ds.system.cudk_bypass_state == true); }, function () { done(0); }, function () { done(1); });
			
			});
		it('bypass command set FALSE', function (done) {
			this.timeout(60000);

			// make it on started CU
			var num=0;
			jchaos.setBypass(cu_in_start, false, function(d){
				done(false);

			});
		/* 	cu_in_start.forEach(function (elem) {
				//	console.log("\t ["+elem+"] set bypass false");
				jchaos.setBypass(elem, false, function(d){
					num++;
					if(num==cu_in_start.length){
						done(false);
					}
				});
			}); */
				
		});
		it('check for bypass command set FALSE', function (done) {
			this.timeout(60000);

			jchaos.checkLive('check for bypass command set FALSE',cu_in_start, 20, 2000, function (ds) { return (ds.system.cudk_bypass_state == false); }, function () { done(0); }, function () { done(1); });


		});
	});


		it('check for health updates every 5s', function (done) {
			this.timeout(60000);

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
