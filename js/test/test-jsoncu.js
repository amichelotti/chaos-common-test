var assert = require('assert');

var jchaos = require('jchaos.js');
options={};

var clock = new Date();

options={};
var npush=1000

process.argv.forEach(function (val, index, array) {
	  
	  if(val=="uri"){
		  options.uri=array[index+1];
		  console.log(val+"="+ array[index+1]);
	  }
	  if(val=="async"){
		  options.async=(array[index+1]=="true");
		  console.log(val+"="+ array[index+1]);
	  }
	  if(val=="npush"){
		  npush=(array[index+1]);
		  console.log(val+"="+ array[index+1]);
	  }
	});
	
	myobjDefinition={
		name:"ciao",
		v:{"$numberDouble":"1.0"},
		arrd:[{"$numberDouble":"1.0"},{"$numberDouble":"2.0"}],
		arr64:[{"$numberLong":"1"},{"$numberLong":"2"}],
		int32:1,
		boolv:true

	};
		
myobj={
	name:"ciao",
	v:1.0,
	arrd:[1.0,2.0],
	arr64:[1,2],
	int32:1,
	boolv:true

};

jchaos.setOptions(options);

var ncu=0;
var byte_received=0;
var start_test=Date.now();
var end_test=0;
var started_cu=[];
describe("CHAOS CU JSON TEST",function(){
	it('Stopping all started CU',function(done){
		jchaos.getCUStatus("Start", function (ll) {
			console.log("N. CU in Start:" + ll.length);
			started_cu = ll;
			
		    jchaos.node(started_cu, "stop", "cu", null, null);

			jchaos.checkLive('Stopping all started CU',started_cu, 10, 5000, function (ds) { return (ds!=null)&&ds.hasOwnProperty("health")&&ds.health.hasOwnProperty("nh_status")&&(ds.health.nh_status == "Stop"); }, function () { done(0); }, function () { done(1) });
		});
	});

	it('Registering object',function(done){
		jchaos.registerCU("IMA/ACCELEROMETER/DAQ",myobjDefinition,function(data){
			console.log("- registration ok");
			done();
		});
	});
	it('Pushing object',function(done){
		var cnt=0;
		var pushdone=0;
		start_test=Date.now();
		jchaos.normalizeDataset(myobj);
		this.timeout(600000);
		console.log("- Start Rest push test");

		while(cnt<npush){
			
			jchaos.pushCU("IMA/ACCELEROMETER/DAQ",myobj,function(){
				myobj.v+=1.0;
				myobj.arrd[0]=2.0*cnt +1;
				myobj.arrd[1]=2.0*cnt;
				myobj.timestamp=clock.getTime();
				myobj.boolv=!myobj.boolv;
				myobj.int32=myobj.int32+1;
				cnt++;
				if(cnt==npush){
					end_test=Date.now();
					console.log("- Push Test "+ npush + " elems - End");
					console.log("- Total time: "+(end_test - start_test )+ " ms, push/s: "+(npush*1000/(end_test - start_test )));
					done();
					return;
				}
			});
		}
		
	});
	it('Restarting all stopped CU',function(done){
		jchaos.getCUStatus("Stop", function (ll) {
			console.log("N. CU in Stop:" + ll.length);
			started_cu = ll;
			
			//jchaos.sendCUCmd(cu_status, "stop", "", null);
			jchaos.node(started_cu, "start", "cu", null, null);

			jchaos.checkLive('Restarting all stopped CU',started_cu, 10, 5000, function (ds) { return (ds!=null)&&ds.hasOwnProperty("health")&&ds.health.hasOwnProperty("nh_status")&&(ds.health.nh_status == "Start"); }, function () { done(0); }, function () { done(1) });
		});
	});
});
	
