
var jchaos = require('webChaos/jchaos.js');

var clock = new Date();

options={};
var npush=10000

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
myobj={
	name:"ciao",
	v:1.0,
	arr:[1.0,2.0]
};

jchaos.setOptions(options);

var ncu=0;
var byte_received=0;
var start_test=Date.now();
var end_test=0;
console.log("- Live Test start ");

jchaos.search("","cu",true,function(data){
	ncu=data.length;
	data.forEach(function(elem){
	//	console.log("CU:"+elem);
	});
	//console.log("- CU alive:"+ncu);

	jchaos.getChannel(data,-1,function(data){
		//console.log("datasets:"+JSON.stringify(data));
		byte_received+=JSON.stringify(data).length;
		//console.log("byte received:"+byte_received);
		end_test=Date.now();
		setTimeout(function(){ 
			console.log("- Live Test - End ");

			console.log("- CU alive:"+ncu);
			console.log("- CU channel received :"+(byte_received/1024)) + " Kb";
			console.log("- Total time: "+(end_test - start_test)  + " ms , bandwith: "+(byte_received/(end_test - start_test) ) + " Kb/s");
			
			
			
			console.log("---------------");
			console.log("- Registration/Push Test start ");

			start_test=Date.now();
			jchaos.registerCU("IMA/ACCELEROMETER/DAQ",myobj,function(data){
				console.log("- registration ok");
				var cnt=0;
				var clear=0;
				while(cnt++<npush){
					myobj.v+=1.0;
					myobj.arr[0]=2.0*cnt +1;
					myobj.arr[1]=2.0*cnt;
					myobj.timestamp=clock.getTime();
					jchaos.pushCU("IMA/ACCELEROMETER/DAQ",myobj,function(data2){
						end_test=Date.now();
						if(clear!=0){
							clearTimeout(clear);
						}
					//	console.log("push "+cnt+ " OK");
						clear=setTimeout(function(){ 
							console.log("- Push Test "+ npush + " elems - End");
							console.log("- Total time: "+(end_test - start_test )+ " ms, push/ms: "+(npush/(end_test - start_test )));
							}, 1000);
				});
				}
			});

			}, 1000);
	});

});


