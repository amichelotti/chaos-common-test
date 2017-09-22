var assert = require('assert');
//var assert = require('chai').assert;

var jchaos = require('jchaos.js');
options={};

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

var cualive=[];
var status_to_check=["Start","Stop","Init","Deinit","Fatal Error", "Recoverable Error"];
var cualive_by_status=[];

var cualive_ds=[];
var cu_all=[];
var class_alive=[];
var class_all=[];
var zone_alive=[];
var zone_all=[];
jchaos.setOptions(options);


describe('CHAOS TEST POWERSUPPLY',function(){
	this.timeout(60000);
	it('check Start->Stop',function(done){
		var cu_in_start=[];
		var cu_in_stop=[];
		jchaos.getCUStatus("Start",function(ll){
			console.log("N. CU in Start:"+ll.length);
			cu_in_start=ll;
			if(cu_in_start.length==0)
				done();
			jchaos.forceState(cu_in_start,"Stop",function(d){

			});
			setTimeout(function(){

				var some_error=0;
				jchaos.getChannel(cu_in_start,4,function(data){
					if(!(data instanceof Array)){
						console.error("should be an array:'"+JSON.stringify(data)+"'");
						done(1);
						return;
					}
					data.forEach(function(elem){
						//	console.log("==>"+JSON.stringify(elem));
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
	/*	it('check Stop->Start',function(done){

		var cu_in_start=[];
		var cu_in_stop=[];
		jchaos.getCUStatus("Stop",function(ll){
			console.log("N. CU in Stop:"+ll.length);
			cu_in_state=ll;
			if(ll.length==0)
				done();
			jchaos.forceState(cu_in_state,"Start",function(d){
				setTimeout(function(){
					var some_error=0;
					jchaos.getChannel(cu_in_state,4,function(data){
						if(!( data instanceof Array)){
							console.error("should be an array:'"+JSON.stringify(data)+"'");
							done(1);
							return;
						}
						data.forEach(function(elem){
							console.log("["+cu_in_state+"]=+>"+JSON.stringify(elem));

							if(elem.health.nh_status != "Start"){
								some_error++;
								console.error(" Transition Stop->Start of "+elem.health.ndk_uid + " failed state is '"+elem.health.nh_status+"'" );
							}				
						});

						done(some_error);

					});
				},2000);
			});
		});

	});
	 */
	/*	it('check Stop->Deinit',function(done){

		var cu_in_start=[];
		var cu_in_stop=[];
		jchaos.getCUStatus("Stop",function(ll){
			console.log("N. CU in Stop:"+ll.length);
			cu_in_state=ll;
			if(ll.length==0)
				done();
			jchaos.forceState(cu_in_state,"Deinit",function(d){
				setTimeout(function(){
					var some_error=0;
					jchaos.getChannel(cu_in_state,4,function(data){
						if(!( data instanceof Array)){
							console.error("should be an array:'"+JSON.stringify(data)+"'");
							done(1);
							return;
						}
						data.forEach(function(elem){
							console.log("["+cu_in_state+"]=+>"+JSON.stringify(elem));

							if(elem.health.nh_status != "Deinit"){
								some_error++;
								console.error(" Transition Stop->Deinit of "+elem.health.ndk_uid + " failed state is '"+elem.health.nh_status+"'" );
							}				
						});

						done(some_error);

					});
				},2000);
			});
		});

	});*/

});

