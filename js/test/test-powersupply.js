var assert = require('assert');
//var assert = require('chai').assert;

var jchaos = require('jchaos.js');
var jpowersupply = require('jpowersupply.js');

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
var btf = [];
var all_ok=0;

jchaos.setOptions(options);

var powersupply_setpoint = {
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
var prepared_snapshot = [];
var snapshot_dataset = {
	"snapshot_name": "undefined",
	"datasets": []
};

var snapshot_dataset_list = [];

describe('CHAOS POWERSUPPLY OPERATIVE TEST', function () {
	var snapinfo = new Object;
	it('retriving BTF QUADRUPOLES/DIPOLE', function (done) {
		this.timeout(120000);

		jchaos.search(["BTF/QUADRUPOLE", "BTF/DIPOLE","TEST/QUADRUPOLE/EXTERNAL"], "cu", true, function (data) {
			btf = data;
			console.log("\t PowerSupply:"+btf);
			done(btf.length <= 0);
		});
	
	});
	describe('preparing snapshots', function () {
		it('zero-stby', function (done) {
			this.timeout(120000);

			var snapshot_set = [];
			var nok = btf.length;
			var polarity = 1;
			var current = Number(0.0000001);
			snapinfo['zero-stby'] = [];

			btf.forEach(function (elem) {
				var snap = JSON.parse(JSON.stringify(powersupply_setpoint));
				snap.input.stby = true;
				snap.input.current = current;
				snap.input.ndk_uid = elem;
				snap.input.polarity = polarity;
				snap.output.ndk_uid = elem;
				snap.output.polarity = polarity;
				snap.output.stby = true;
				snap.output.current = current;
				polarity = polarity > 0 ? -1 : 1;
				//console.log("uid:"+snap.input.ndk_uid);
				snapinfo['zero-stby'].push(snap);
				//snapshot_set.push(powersupply_setpoint);
				jchaos.snapshot("zero-stby", "set", "", JSON.stringify(snap), function (d) {
					nok--;
				});
			});
			snapshot_dataset_list.push(snapinfo);
			setTimeout(function () {
			    prepared_snapshot.push("zero-stby");
			    	if(nok){
					console.log("zero-stby NOT SET, missing:"+nok);
				}

				done(nok);

			}, 5000);

		});
		it('2-increments-oper', function (done) {
			this.timeout(120000);

			var snapshot_set = [];
			var nok = btf.length;
			//powersupply_setpoint.input.stby=0;
			var current = Number(2.0000000001);
			var polarity = 1;
			snapinfo['2-increments-oper'] = [];


			btf.forEach(function (elem) {
				var snap = JSON.parse(JSON.stringify(powersupply_setpoint));
				snap.input.stby = false;
				snap.output.stby = false;
				snap.input.current = current;
				snap.input.ndk_uid = elem;
				snap.input.polarity = polarity;
				snap.output.ndk_uid = elem;
				snap.output.polarity = polarity;
				snap.output.current = current;
				polarity = polarity > 0 ? -1 : 1;
				//console.log("uid:"+snap.input.ndk_uid);
				polarity = (polarity > 0) ? -1 : 1;
				current += 2.000000000001;
				snapinfo['2-increments-oper'].push(snap);
				jchaos.snapshot("2-increments-oper", "set", "", JSON.stringify(snap), function (d) {
					nok--;
				});
				snapshot_dataset_list.push(snapinfo);
			});
			setTimeout(function () {
				prepared_snapshot.push("2-increments-oper");
				if(nok){
					console.log("2-increments-oper NOT SET, missing:"+nok);
				}
				done(nok);

			}, 5000);

		});
		it('check for snapshots in the system', function (done) {
			this.timeout(120000);

			var snapshot_list = [];

			jchaos.search("", "snapshots", false, function (data) {
				//snapshot_list=JSON.stringify(data);
				//console.log("LIST:"+snapshot_list);
				data.forEach(function (item) {
					snapshot_list.push(item.name);
				});
				var found = 0;
				prepared_snapshot.forEach(function (elem) {
					snapshot_list.forEach(function (elem2) {
						if (elem2 == elem) {
							found++;
						}
					});
				});

				if (prepared_snapshot.length == found) {
					done();
				} else {
					console.error("snapshot list '" + snapshot_list + "' doesn't match expected: '" + prepared_snapshot + "'");
					done(1);
				}

			});
		});
	});
	function promiseCheckSnap(snap,culist){
		var ret=new Promise(function(resolve,reject){
		jchaos.snapshot(snap, "restore", "", "", function (d) {
			jchaos.checkLive("check restore '" + snap + "'", culist,20, 5000, function (ds) { return (ds.system.busy == false)&&(ds.system.cudk_set_tag==snap)&&(ds.system.cudk_set_state==3); }, function () {
				jchaos.getChannel(culist, -1, function (data) {
					var error = 0;
					data.forEach(function (elem) {
						var expected = snapinfo[snap];
						expected.forEach(function (id) {
							if (id.input.ndk_uid == elem) {
								error += jpowersupply.compareDatasets(data[0], id);
							}
						});

					});
	
					if(error==0){
					
						console.log(" SNAP OK");
						resolve(error);
						return;
					} else {
						console.log("SOME ERROR SNAP ");
						reject(error);
						return;
					}

				});
			}, function () {
				console.log("TIMEOUT");
				reject(-2);
				return;

			});

		}, function () {
			console.log("snapshot restore command on '" + snap + " FAILED");
			reject(-1);


		});
	});
	return ret;
	}
	describe("checking snapshot restores", function () {
				this.timeout(120000);
				it('zero-stby', function () {
					return promiseCheckSnap('zero-stby',btf);
				});
				it('2-increments-oper', function () {
					return promiseCheckSnap('2-increments-oper',btf);
				});			

	});
/*	describe("finale check", function () {
		it('restore all snapshots check ok', function (done)  {
			jchaos.checkPeriodiocally("check all restored",10,5000,
			function(){return (all_ok==prepared_snapshot.length)},function(){done(0);},function(){done(1);});

		});
	});*/

});

