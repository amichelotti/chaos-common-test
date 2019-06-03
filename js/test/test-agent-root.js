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
	it('Upload script',function(done){
		var script={};
		script['name']="simpleRootCounter.C";
		script['eudk_script_content']=btoa(unescape(encodeURIComponent(root_program)));
		script['eudk_script_language']="CPP";
		script['description']="CHAOS AGENT ROOT TEST";
		script['default_argument']="simpleCounter(10)";
	    script['workingdir']="";
	    console.log("saving script:"+JSON.stringify(script));
	    jchaos.saveScript(script, function (data) {
		done();
	    });
		
	});
	it('Load back and Execute',function(done){
		jchaos.loadScript("simpleRootCounter.C", 0, function (data) {
			var agent_server="localhost";
			var launch_arg="";
			if (process.env.hasOwnProperty('AGENT_SERVER')){
				agent_server=process.env['AGENT_SERVER'];
			}
			var name = data['script_name'];
            var language = data['eudk_script_language'];
			var defargs = data['default_argument'];
			var workingdir=data['workingdir'];
			jchaos.rmtGetEnvironment(agent_server + ":8071", "CHAOS_PREFIX", function (r) {
				var chaos_prefix = r.data.value;
				launch_arg = chaos_prefix + "/bin/chaosRoot --conf-file " + chaos_prefix + "/etc/chaos_root.cfg --rootopt \"-q " + path + defargs + "\"";
				jchaos.rmtCreateProcess(agent_server + ":8071", name, launch_arg, language, workingdir, function (r) {
                    console.log("Script running onto:" + server + " :" + JSON.stringify(r));
					done(0);
				
                  }, function (bad) {
                    console.log("Some error getting loading script:" + bad);
					done(1);
                  });

			});
		});	
	});
	it('Test Status',function(done){
		var agent_server="localhost";
			var launch_arg="";
			if (process.env.hasOwnProperty('AGENT_SERVER')){
				agent_server=process.env['AGENT_SERVER'];
			}
			jchaos.checkPeriodiocally("Check Tests ents", 30, 1000, function(){
				var stat=jchaos.rmtListProcess(agent_server + ":8071", null);
				if(stat.hasOwnProperty("info")){
					console.log("process info:"+JSON.stringify(stat));
					if(stat.data.processes instanceof Array){
						if(stat.data.processes[0].msg=="ENDED"){
							return true;
						}
						return false;
					} else {
						console.log("## cannot find processes key:" +JSON.stringify(stat));
						return false;
					}
				} else {
					return false;
				}
				
			}, function(){done(0);}, function(){done(1);});

		
			
	});
});
	
