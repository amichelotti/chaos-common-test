var assert = require('assert');
var btoa = require('btoa.js');
var atob = require('atob.js');

var jchaos = require('jchaos.js');
options = {};

var clock = new Date();

options = {};
var npush = 500
var uid="";

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
var root_program = "#include <driver/misc/models/cernRoot/rootUtil.h>\nint simpleRootCounter(int max){\n int cnt;for(cnt=0;cnt<max;cnt++){std::cout<<\"counter:\"<<cnt<<std::endl;sleep(1);} std::cout<<\"END COUNTER:\"<<cnt<<std::endl;exit(0);}";


jchaos.setOptions(options);

var start_test = Date.now();
var best_agent="";
var best_server="";
describe("CHAOS AGENT ROOT TEST", function () {
	this.timeout(1200000);
	it('Find best agent', function (done) {
		jchaos.findBestServer(function (bs,ba) {
			best_agent=ba;
			best_server=bs;
			if((best_agent!="")&&(best_server!="")){
				console.log("\tbest server:"+best_server);
				console.log("\tbest agent:"+best_agent);

				done(0);
			}else {
				console.log("\t## no valid server retrieved");
				done(1);
			}
		});

	});

	it('Upload script', function (done) {
		var script = {};
		script['name'] = "simpleRootCounter";
		script['script_name'] = "simpleRootCounter.C";

		script['eudk_script_content'] = root_program;
		script['eudk_script_language'] = "CPP";
		script['script_description'] = "CHAOS AGENT ROOT TEST";
		script['default_argument'] = "(5)";
		script['workingdir'] = "";
		console.log("saving script:" + JSON.stringify(script));
		jchaos.saveScript(script, function (data) {
			done(0);
		},function(err){
			done(1);
		});

	});
	it('Load back and Execute', function (done) {
		jchaos.search("simpleRootCounter.C", "script", false, function (l) {
			var list_algo = l['found_script_list'];
			
			list_algo.forEach(function (elem) {
				console.log(" found " + elem.script_name + " id:" + elem.seq)
			});
		    // take the last
		    jchaos.loadScript(list_algo[0].script_name, list_algo[list_algo.length-1].seq, function (data) {
				var agent_server = "localhost";
				var launch_arg = "";
				if (process.env.hasOwnProperty('AGENT_SERVER')) {
					agent_server = process.env['AGENT_SERVER'];
				}
				var name = data['script_name'];
				var language = data['eudk_script_language'];
				var defargs = data['default_argument'];
				var workingdir = data['workingdir'];
			      //  console.log("loadScript of :" + JSON.stringify(data));
			data['eudk_script_content']=btoa(data['eudk_script_content']);
				jchaos.rmtUploadScript(agent_server + ":8071", data, function (p) {
					//console.log("rmtUploadScript:" + JSON.stringify(p));
					jchaos.rmtGetEnvironment(agent_server + ":8071", "CHAOS_PREFIX", function (r) {
						var chaos_prefix = r.data.value;
						var path = p.data.path;
					//	console.log("rmtGetEnvironment:" + JSON.stringify(p));

						launch_arg = chaos_prefix + "/bin/chaosRoot --conf-file " + chaos_prefix + "/etc/chaos_root.cfg --rootopt \"-q " + path + defargs + "\"";
						jchaos.rmtCreateProcess(agent_server + ":8071", name, launch_arg, language, workingdir, function (r) {
							pid=r.info.pid;
							uid=r.data.uid;
						//	console.log("\tScript running onto:" + agent_server + " UID:"+uid+" :" + JSON.stringify(r));
							done(0);

						}, function (bad) {
							console.log("Some error getting loading script:" + bad);
							done(1);
						});

					});
				},function(err){
					console.log("##cannot upload err:"+JSON.stringify(err));
					done(1);
				});
			});
		});
	});
	it('Test Status', function (done) {
		var agent_server = "localhost";
		var launch_arg = "";
		if (process.env.hasOwnProperty('AGENT_SERVER')) {
			agent_server = process.env['AGENT_SERVER'];
		}
		jchaos.checkPeriodiocally("Check Tests ends", 120, 2000, function () {
			var stat = jchaos.rmtListProcess(agent_server + ":8071", null);
			if (stat.data.hasOwnProperty("processes")) {
				if (stat.data.processes instanceof Array) {
					for(var i in stat.data.processes){
						//console.log("process info:" + JSON.stringify(p));
						var cuid=stat.data.processes[i].uid;
						var cmsg=stat.data.processes[i].msg;
						if((cuid==uid)&&(cmsg== "ENDED")){
							console.log("\tEND uid "+cuid+" "+cmsg);
							return true;
						} else {
							console.log("\tuid "+cuid+" "+cmsg);
						}
					}	
			}
				
			} 
			return false;

		}, function () { done(0); }, function () { done(1); });



	});
	it('Test Console', function (done) {
		var agent_server = "localhost";
		if (process.env.hasOwnProperty('AGENT_SERVER')) {
			agent_server = process.env['AGENT_SERVER'];
		}
		jchaos.rmtGetConsole(agent_server + ":8071", uid, 0, -1, function (r) {
			console.log(atob(r.data.console));
			done(0);

		  }, function (bad) {
			console.log("Some error getting console occur:" + bad);
			done(1);
		  });
		
	});
	it('Test Associate Script sineWave', function (done) {
		jchaos.associateNode(best_agent,"ALGO/WAVE","","sineWave.C",true,false,false,function(ok){
			done(0);
		},function(err){
			console.log("\t## Association error:"+JSON.stringify(err));
			done(1);
		});
		
	});
	it('Test Start  sineWave', function (done) {
		jchaos.node("ALGO/WAVE", "start", "us", function () {
			console.log("start ok");
			done(0);
		}, function (err) {
			console.log("## Starting error:"+JSON.stringify(err));
			done(1);
		});
		
	});

	it('Test if lives', function (done) {
		jchaos.checkLive('Live check',["ALGO/WAVE/TEST/SINWAVE"], 30, 2000, function (ds) {
			var ret=false;
		//	console.log("syslen:"+JSON.stringify(ds.system).length+ " healt len:"+JSON.stringify(ds.health).length+" outlen:"+JSON.stringify(ds.output).length); 
			if(typeof(JSON.stringify(ds.system))=='undefined'){
				console.log(ds.health.ndk_uid,": SYSTEM Undefined");
			}
			if(typeof(JSON.stringify(ds.health))=='undefined'){
				console.log(ds.system.ndk_uid,": HEALTH Undefined");
			}
			if(typeof(JSON.stringify(ds.output))=='undefined'){
				console.log(ds.system.ndk_uid,": OUTPUT Undefined");
			}
			if(typeof(JSON.stringify(ds.input))=='undefined'){
				console.log(ds.health.ndk_uid,": INPUT Undefined");
			}
			try{
				ret=((JSON.stringify(ds.system).length >= 2) && (JSON.stringify(ds.health).length >= 2) && (JSON.stringify(ds.output).length >= 2));
			} catch(err){
			}
			return ret; }, function () { done(0); }, function () { done(1); });
	
		
	});
	it('Test STOP  sineWave', function (done) {
		jchaos.node("ALGO/WAVE", "stop", "us", function () {
			done(0);
		}, function (err) {
			console.log("## error:"+err);
			done(1);
		});
		
	});
	it('Remove Node  sineWave', function (done) {
		jchaos.node("ALGO/WAVE/TEST/SINWAVE", "deletenode", "root", function () {
			done(0);
		}, function (err) {
			console.log("## deleting error:"+err);
			done(1);
		});
		
	});

});

