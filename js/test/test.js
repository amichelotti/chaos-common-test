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
var cualive_ds=[];
var cu_all=[];
var class_alive=[];
var class_all=[];
var zone_alive=[];
var zone_all=[];
jchaos.setOptions(options);
describe('SEARCH',function(){

	it('SEARCH ALIVE CU array not null array of names',function(done){
		jchaos.search("","cu",true,function(data){

			done(data.length<=0);
			cualive=data;

		});
	})
	it('SEARCH ALL CU greater ALIVE cu',function(done){
		jchaos.search("","cu",false,function(data){
			cu_all=data;
			done(cu_all.length>cualive.lenght);	

		});
	})
	it('SEARCH CLASS ALIVE array not null array of names',function(done){
		jchaos.search("","class",true,function(data){
			class_alive=data;
			done(class_alive.length<=0);

		});
	})
	it('SEARCH CLASS ALL array not null array of names',function(done){
		jchaos.search("","class",false,function(data){
			class_all=data;
			done(class_all.length<=0);

		});
	})

	it('SEARCH ZONE ALIVE array not null array of names',function(done){
		jchaos.search("","zone",true,function(data){
			zone_alive=data;

			done(zone_alive.length<=0);

		});
	})
	it('SEARCH ZONE ALL array not null array of names',function(done){
		jchaos.search("","zone",false,function(data){
			zone_all =data;	

			done(zone_all.length<=0);


		});
	})

	after(function(){		
		console.log("\tALIVE CU      :"+cualive.length);
		console.log("\tALL CU        :"+cu_all.length);
		console.log("\tALIVE CLASSES :"+class_alive);
		console.log("\tALIVE ZONE    :"+zone_alive);


	});
});
describe('CHECK LIVE DATASETS',function(){
	it('all live dataset should be valid',function(){
cualive.forEach(function(elem){
	describe('['+elem+'] LIVE DATESET',function(){
		it( '['+elem+'] should retrive a valid DATASET',function(done){
			jchaos.getChannel(elem,-1,function(data){
				var ds=JSON.stringify(data);
				JSON.parse(ds);
				var sys=JSON.stringify(data[0].system);
				var healt=JSON.stringify(data[0].health);
				var out=JSON.stringify(data[0].output);
				var input=JSON.stringify(data[0].input);
				// system and health should be present
				
				//console.log("bytes:"+ds.length+" sys:"+sys + " health:"+healt.length);
				done((ds.length<2)|| (sys.length<2)|| (healt.length<2)|| (out.length<2)|| (input.length<2)) ;
			});

		});
	});
});
	});

});
describe('CHECK OVERALL STATUS',function(){
    this.timeout(15000);
    	it('GET FULL LIVE STATUS',function(done){
			jchaos.getChannel(cualive,-1,function(data){
				cualive_ds=data;
				var check=JSON.stringify(data);
			//	console.log("arry:"+data.length+" full status:"+check);
				done((check.length<2)|| (data.length!=cualive.length));
			});
	});

})
