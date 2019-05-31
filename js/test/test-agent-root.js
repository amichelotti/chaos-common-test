var assert = require('assert');

var jchaos = require('jchaos.js');
options={};

var clock = new Date();

options={};
var npush=500

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
	var root_program="#include <driver/misc/models/cernRoot/rootUtil.h> int simpleCounter(int max){ for(int cnt=0;cnt<max;cnt++){std::cout<<\"counter:\"<<cnt<<std::endl;sleep(1);} std::cout<<\"END COUNTER:\"<<cnt<<std::endl;return cnt;}";


	jchaos.setOptions(options);

	var start_test=Date.now();

describe("CHAOS AGENT ROOT TEST",function(){
	it('Load script',function(done){
		jchaos.registerCU("IMA/ACCELEROMETER/DAQ",myobjDefinition,function(data){
			console.log("- registration ok");
			done();
		});
	});
});
	
