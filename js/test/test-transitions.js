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
var tot_ok = 0;

jchaos.setOptions(options);


describe('CHAOS TEST TRANSITIONS', function () {
	this.timeout(60000);
	it('check Start->Stop', function (done) {
		var cu_status = [];
		jchaos.getCUStatus("Start", function (ll) {
			console.log("N. CU in Start:" + ll.length);
			cu_status = ll;
			if (cu_status.length == 0)
				done();
			//jchaos.sendCUCmd(cu_status, "stop", "", null);
			jchaos.node(cu_status, "stop", "cu", null, null);

			jchaos.checkLive('check Start->Stop',cu_status, 20, 5000, function (ds) { return (ds!=null)&&ds.hasOwnProperty("health")&&ds.health.hasOwnProperty("nh_status")&&(ds.health.nh_status == "Stop"); }, function () { done(0); }, function () { done(1) });
		});
	});
	it('check Stop->Deinit', function (done) {
		var cu_status = [];
		jchaos.getCUStatus("Stop", function (ll) {
			console.log("N. CU in Stop:" + ll.length);
			cu_status = ll;
			if (cu_status.length == 0)
				done();
//		    jchaos.sendCUCmd(cu_status, "deinit", "", null);
		    jchaos.node(cu_status, "deinit", "cu", null, null);
			jchaos.checkLive('check Stop->Deinit',cu_status, 20, 5000, function (ds) { return (ds!=null)&&ds.hasOwnProperty("health")&&ds.health.hasOwnProperty("nh_status")&&(ds.health.nh_status == "Deinit"); }, function () { done(0); }, function () { done(1) });

		});
	});
	
	it('check Deinit->Init', function (done) {
		var cu_status = [];
		jchaos.getCUStatus("Deinit", function (ll) {
			console.log("N. CU in Deinit:" + ll.length);
			cu_status = ll;
			if (cu_status.length == 0)
				done();
//		    jchaos.sendCUCmd(cu_status, "deinit", "", null);
		    jchaos.node(cu_status, "init", "cu", null, null);
		    jchaos.checkLive('check Deinit->Init',cu_status, 20, 5000, function (ds) { return (ds!=null)&&ds.hasOwnProperty("health")&&ds.health.hasOwnProperty("nh_status")&&(ds.health.nh_status == "Init"); }, function () { done(0); }, function () { done(1) });

		});
	});
    
	it('check Init->Start', function (done) {
		var cu_status = [];
		jchaos.getCUStatus("Init", function (ll) {
			console.log("N. CU in Init:" + ll.length);
			cu_status = ll;
			if (cu_status.length == 0)
				done();
			//jchaos.sendCUCmd(cu_status, "start", "", null);
			jchaos.node(cu_status, "start", "cu", null, null);

			jchaos.checkLive('check Init->Start',cu_status, 20, 5000, function (ds) { return (ds!=null)&&ds.hasOwnProperty("health")&&ds.health.hasOwnProperty("nh_status")&&(ds.health.nh_status == "Start"); }, function () { done(0); }, function () { done(1) });

		});
	});
	it('check2 Start->Stop', function (done) {
		var cu_status = [];
		jchaos.getCUStatus("Start", function (ll) {
			console.log("N. CU in Start:" + ll.length);
			cu_status = ll;
			if (cu_status.length == 0)
				done();
			//jchaos.sendCUCmd(cu_status, "stop", "", null);
			jchaos.node(cu_status, "stop", "cu", null, null);

			jchaos.checkLive('check2 Start->Stop',cu_status, 20, 5000, function (ds) { return (ds!=null)&&ds.hasOwnProperty("health")&&ds.health.hasOwnProperty("nh_status")&&(ds.health.nh_status == "Stop"); }, function () { done(0); }, function () { done(1) });
		});
	});
	it('check2 Stop->Deinit', function (done) {
		var cu_status = [];
		jchaos.getCUStatus("Stop", function (ll) {
			console.log("N. CU in Stop:" + ll.length);
			cu_status = ll;
			if (cu_status.length == 0)
				done();
		    jchaos.node(cu_status, "deinit", "cu", null, null);
			jchaos.checkLive('check2 Stop->Deinit',cu_status, 20, 5000, function (ds) { return (ds!=null)&&ds.hasOwnProperty("health")&&ds.health.hasOwnProperty("nh_status")&&(ds.health.nh_status == "Deinit"); }, function () { done(0); }, function () { done(1) });

		});
	});
	 it('check Deinit->Unload', function (done) {
	 	var cu_status = [];
	 	jchaos.getCUStatus("Deinit", function (ll) {
	 		console.log("N. CU in Deinit:" + ll.length);
	 		cu_status = ll;
	 		if (cu_status.length == 0)
	 			done();
			jchaos.node(cu_status, "unload", "cu", null, null);
	 
	 		/*cu_status.forEach(function (elem) {
	 			jchaos.loadUnload(elem, false, null);
	 		});*/
	 		jchaos.checkLive('check Deinit->Unload',cu_status, 20, 5000, function (ds) { return (ds!=null)&&ds.hasOwnProperty("health")&&ds.health.hasOwnProperty("nh_status")&&(ds.health.nh_status == "Unload"); }, function () { done(0); }, function () { done(1) });

	 	});
	 });

	  it('check Unload->Load', function (done) {
	 	var cu_status = [];
	 	jchaos.getCUStatus("Unload", function (ll) {
	 		console.log("N. CU in Unload:" + ll.length);
	 		cu_status = ll;
	 		if (cu_status.length == 0)
	 			done();
	 		/*cu_status.forEach(function (elem) {
	 			jchaos.loadUnload(elem, true, null);
			 });*/
			 jchaos.node(cu_status, "load", "cu", null, null);

	 		jchaos.checkLive('Unload->Load',cu_status, 20, 5000, function (ds) { return (ds!=null)&&ds.hasOwnProperty("health")&&ds.health.hasOwnProperty("nh_status")&&(ds.health.nh_status == "Load"); }, function () { done(0); }, function () { done(1) });
	 	});
	 });
	  it('check Load->Init', function (done) {
	 	var cu_status = [];
	 	jchaos.getCUStatus("Load", function (ll) {
	 		console.log("N. CU in Load:" + ll.length);
 			cu_status = ll;
	 		if (cu_status.length == 0)
	 			done();
			jchaos.node(cu_status, "init", "cu", null, null);
	 		jchaos.checkLive('Load->Init',cu_status, 20, 1000, function (ds) { return (ds!=null)&&ds.hasOwnProperty("health")&&ds.health.hasOwnProperty("nh_status")&&(ds.health.nh_status == "Init"); }, function () { done(0); }, function () { done(1) });

	 	});
     });
	 it('check3 Init->Start', function (done) {
		var cu_status = [];
		jchaos.getCUStatus("Init", function (ll) {
			console.log("N. CU in Init:" + ll.length);
			cu_status = ll;
			if (cu_status.length == 0)
				done();
			jchaos.node(cu_status, "start", "cu", null, null);

			//jchaos.sendCUCmd(cu_status, "start", "", null);

			jchaos.checkLive('check3 Init->Start',cu_status, 20, 5000, function (ds) { return (ds!=null)&&ds.hasOwnProperty("health")&&ds.health.hasOwnProperty("nh_status")&&(ds.health.nh_status == "Start"); }, function () { done(0); }, function () { done(1) });

		});
	});
});

