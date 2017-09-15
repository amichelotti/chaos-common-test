var assert = require('assert');
//var assert = require('chai').assert;

var jchaos = require('jchaos.js');
var jpowersupply = require('jpowersupply.js');

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

var btf=[];
var powersupply_setpoint={
		"input":{
			"ndk_uid":"undefined",
			"current":0.1,
			"stby":true,
			"polarity":1
		},
		"output":{
			"ndk_uid":"undefined",
			"current":0.1,
			"stby":true,
			"polarity":1,
			"local":false
		}
};
var prepared_snapshot=[];
var snapshot_dataset={
		"snapshot_name":"undefined",
		"datasets":[]
};

var snapshot_dataset_list=[];

describe('CHAOS POWERSUPPLY OPERATIVE TEST',function(){
	var snapinfo= new Object;
	this.timeout(15000);
	it('retriving BTF QUADRUPOLES/DIPOLE',function(done){
		jchaos.search(["BTF/QUADRUPOLE","BTF/DIPOLE]"],"cu",true,function(data){
			btf=data;
			done(btf.length<=0);
		});
	});
	describe('preparing snapshots',function(){
		it('zero-stby',function(done){
			var snapshot_set=[];
			var nok=btf.length;
			var polarity=1;
			var current=Number(0.0000001);
			snapinfo['zero-stby']=[];

			btf.forEach(function(elem){
				var snap = JSON.parse(JSON.stringify(powersupply_setpoint));
				snap.input.stby=true;
				snap.input.current=current;
				snap.input.ndk_uid=elem;
				snap.input.polarity=polarity;
				snap.output.ndk_uid=elem;
				snap.output.polarity=polarity;
				snap.output.stby=true;
				snap.output.current=current;
				polarity=polarity>0?-1:1;
				//console.log("uid:"+snap.input.ndk_uid);
				snapinfo['zero-stby'].push(snap);
				//snapshot_set.push(powersupply_setpoint);
				jchaos.snapshot("zero-stby","set","",JSON.stringify(snap),function(d){
					nok--;
				});		
			});
			snapshot_dataset_list.push(snapinfo);
			setTimeout(function(){
				prepared_snapshot.push("zero-stby");
				done(nok);

			},2000);

		});
		it('2-increments-oper',function(done){
			var snapshot_set=[];
			var nok=btf.length;
			//powersupply_setpoint.input.stby=0;
			var current=Number(2.0000000001);
			var polarity=1;
			snapinfo['2-increments-oper']=[];


			btf.forEach(function(elem){
				var snap = JSON.parse(JSON.stringify(powersupply_setpoint));
				snap.input.stby=false;
				snap.output.stby=false;
				snap.input.current=current;
				snap.input.ndk_uid=elem;
				snap.input.polarity=polarity;
				snap.output.ndk_uid=elem;
				snap.output.polarity=polarity;
				snap.output.current=current;
				polarity=polarity>0?-1:1;
				//console.log("uid:"+snap.input.ndk_uid);
				polarity=(polarity>0)?-1:1;
				current+=2.000000000001;
				snapinfo['2-increments-oper'].push(snap);
				jchaos.snapshot("2-increments-oper","set","",JSON.stringify(snap),function(d){
					nok--;
				});		
				snapshot_dataset_list.push(snapinfo);
			});
			setTimeout(function(){
				prepared_snapshot.push("2-increments-oper");
				done(nok);

			},2000);

		});
		it('check for snapshots in the system',function(done){
			var snapshot_list=[];

			jchaos.search("","snapshots",false,function(data){
				//snapshot_list=JSON.stringify(data);
				//console.log("LIST:"+snapshot_list);
				data.forEach(function(item){
					snapshot_list.push(item.name);
				});
				var found=0;
				prepared_snapshot.forEach(function(elem){
					snapshot_list.forEach(function (elem2){
						if(elem2==elem){
							found++;
						}
					});
				});

				if(prepared_snapshot.length==found){
					done();
				} else {
					console.error("snapshot list '"+ snapshot_list+"' doesn't match expected: '"+prepared_snapshot+"'");
					done(1);
				}

			});
		});
		var tot_ok=0;

		function checkBusy(devlist,retry,okhandle,nokhandle){
			tot_ok=0;
		//	console.log(" check busy of" +devlist);

			devlist.forEach(function(elem){
				jchaos.getChannel(elem,0,function(data){
					//console.log(" - "+elem+ " ->"+JSON.stringify(data));
					if(data[0].busy==false){
						tot_ok++;
						console.log("\t- "+data[0].ndk_uid+ " ok "+tot_ok+"/"+devlist.length);

					} else {
						//	console.log("- "+data[0].ndk_uid+ " busy: "+data[0].busy);

					}
				});
			});

			setTimeout(function(){
				if(tot_ok == devlist.length){
					okhandle();
				} else if(--retry>0){
					console.log("retry check... "+retry);

					checkBusy(devlist,retry,okhandle,nokhandle);
				} else {
					console.log("maximum number of retry...");

					nokhandle();
				}
			},5000);
		}
		describe("checking snapshot restores",function(){
			it('restore all snapshots',function(){
				prepared_snapshot.forEach(function(snap){
					describe(' restore '+snap,function(){
						this.timeout(60000);

						it('check restore "'+snap+"'",function(done){
							var error=0;
							var retry=5;
							jchaos.snapshot(snap,"restore","","",function(d){
								checkBusy(btf,10,function(){
									jchaos.getChannel(btf,-1,function(data){
										data.forEach(function(elem){
											var expected=snapinfo[snap];
											expected.forEach(function(id){
												if(id.input.ndk_uid==elem){
													error+=jpowersupply.compareDatasets(data[0],id);
												}
											});	

										});
										done(error);
									});
								},function(){
									done(1);
								});

							});

						});

					});
				});

			});
		});
	});
	/*			

	it('check restore 2-increments-oper',function(done){

		jchaos.snapshot("2-increments-oper","restore","","",function(d){});
		var error=0;
		setTimeout(function(){
			btf.forEach(function(elem){

				jchaos.getChannel(elem,-1,function(data){

					var expected=snapinfo['2-increments-oper'];
					expected.forEach(function(id){
						if(id.input.ndk_uid==elem){
//							console.log("["+elem+ "] comparing:"+JSON.stringify(data[0])," snap:"+JSON.stringify(id));

							error+=jpowersupply.compareDatasets(data[0],id);

							// check output 
						}
					});


				});

			});
			done(error);

		},10000);

	});

});*/
});

