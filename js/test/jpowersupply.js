/**
 * !CHAOS powersupply utilities
 */

(function(){
	function createLibraryjpowersupply(){
		var jpowersupply={};

		jpowersupply.compareDatasets=function(id,d1){
			var error=0;
			var str="\tcomparison ["+id.input.ndk_uid+"] - ["+d1.input.ndk_uid+"]";
			var end=" ('resolution':"+id.input.resolution +", 'state':"+id.health.nh_status+", 'bypass state':"+id.system.cudk_bypass_state+", 'cu_alarm':"+id.output.cu_alarm+", 'device_alarm':"+id.output.device_alarm+", 'busy':"+id.output.busy+")";
					
		//	console.log("comparing datasets "+id + " "+d1);
			if(Math.abs(id.input.current-d1.input.current)>id.input.resolution){
				error++;
				console.error(str + " failed input 'current':"+id.input.current + " - "+ d1.input.current+end);

			}
			if(id.input.stby!=d1.input.stby){
				error++;
				console.error(str + " failed input 'stby':"+id.input.stby + " - "+ d1.input.stby+end);
			}

			if(id.input.polarity!=d1.input.polarity){
				error++;
				console.error(str + " failed input'polarity':"+id.input.polarity + " - "+ d1.input.polarity+end);
			}
			// check output
			if(Math.abs(id.output.current-d1.input.current)> id.input.resolution){
				error++;
				console.error(str + " failed output 'current':"+id.output.current + " - "+ d1.output.current+ " differ for more than resolution:"+id.input.resolution+end);
			}
			if(id.output.stby!=d1.output.stby){
				error++;
				console.error(str + " failed output 'stby':"+id.output.stby + " - "+ d1.output.stby+end);
			}

			if(id.output.polarity!=d1.output.polarity){
				error++;
				console.error(str + " failed output 'polarity':"+id.output.polarity + " - "+ d1.output.polarity+end);
			}

		}
		
		return jpowersupply;

	}
	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined'){


		module.exports = createLibraryjpowersupply();

	} else{
		window.jpowersupply = createLibraryjpowersupply();
	}
}).call(this);
