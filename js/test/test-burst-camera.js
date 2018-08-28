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
var camera_list = [];
var tot_ok = 0;
var start_tag_time;

jchaos.setOptions(options);


describe('TEST BURST FEATURE', function () {
	this.timeout(60000);
	it('check cudk_burst_state and cudk_burst_tag keys in health, and burst state == false', function (done) {
		var cu_status = [];
		jchaos.getCUStatus("Start", function (ll) {
			console.log("N. CU in Start:" + ll.length);
			cu_status = ll;
			if (cu_status.length == 0)
				done();
			
			jchaos.checkLive('check Burst Keys',cu_status, 10, 5000, function (ds) { return (ds!=null)&&ds.hasOwnProperty("system")&&ds.system.hasOwnProperty("cudk_burst_state")&&(ds.system.cudk_burst_state==false)&&ds.system.hasOwnProperty("cudk_burst_tag"); }, function () { done(0); }, function () { done(1) });
		});
	});

	it('find all cameras implementation > 0, start them', function (done) {
		jchaos.findCUByImplementation("Camera",false,function(ll){
			console.log("N. camera found:" + ll.length+ " :"+JSON.stringify(ll));
			camera_list=ll;
			jchaos.node(camera_list, "init", "cu", null, null);
			jchaos.node(camera_list, "start", "cu", null, null);

			done(ll.length<=0);
		});
	});
	it('Start tagging cameras for 10s tagname="burstbyseconds"', function (done) {
		jchaos.tag("burstbyseconds",camera_list,2,10000,function(){
			start_tag_time=Date.now();
			jchaos.checkLive('Tagging check',camera_list, 10, 5000, function (ds) { console.log("id:"+ds.system.ndk_uid+" burst state:"+ds.system.cudk_burst_state+" tag:'"+ds.system.cudk_burst_tag+"'");return (ds!=null)&&ds.hasOwnProperty("system")&&ds.system.hasOwnProperty("cudk_burst_state")&&(ds.system.cudk_burst_state==true)&&ds.system.hasOwnProperty("cudk_burst_tag")&&(ds.system.cudk_burst_tag=="burstbyseconds"); }, function () { done(0); }, function () { done(1) });

		});
	});
	/*it('Retriving tags"', function (done) {
		var stop_tag_time=Date.now();
		var total={};
		camera_list.forEach(function(cam){
			total[cam]=0;
			console.log("\t retriving history of '"+cam+"' from:"+start_tag_time+" to:"+(stop_tag_time+1000)+" tag:burstbyseconds");
			jchaos.getHistory(cam,0,start_tag_time,stop_tag_time+1000,null,function(data){
				total[cam]+=data.Y.length
				console.log(cam+": retrived :"+data.Y.length+ "total:"+total[cam] );
				var cnt=0;
				total.forEach(function(t){
					if(t==10){
						cnt++;
					}
				});
				if(cnt==total.length){
					done();
				}
			},"burstbyseconds");
		});
		
		
		
	});*/
	
});

