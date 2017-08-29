/**
 * !CHAOS REST Library
 */

(function(){
    function createLibrary(){
	var jchaos={};
	
	jchaos.ops_on_going=0;
	jchaos.lastChannel={};
	jchaos.options={
	    updateEachCall:false,
	    uri:"localhost",
	    async:true,
	    limit_on_going:10000,
            history_page_len:1000
            
	};
	jchaos.setOptions=function(opt){
	    for (var attrname in opt) { jchaos.options[attrname] = opt[attrname]; }

	}
	
	jchaos.basicPost= function(func,params,handleFunc){
	    var request;
	    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined'){	
		XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
	    }
	    request = new XMLHttpRequest();
	    var url ="http://" + jchaos.options.uri + ":8081/"+func;
	    request.open("POST", url, (jchaos.ops_on_going>jchaos.options.limit_on_going)?false: jchaos.options.async);
	   // console.log("on going:"+jchaos.ops_on_going);
	   // request.setRequestHeader("Content-Type", 'application/json');
	    request.onreadystatechange = function (e) {
		//console.log("answer:"+request.status + " state:"+request.readyState);
		if (request.readyState == 4){
		    jchaos.ops_on_going--;
		    if( request.status == 200) {
			handleFunc(JSON.parse(request.responseText));
		    } else {
			var str="POST "+ url + " body:\"" + params+"\" went wrong, result:"+request.status+ " state:"+request.readyState ; console.log(str); 
			throw str; 
		    }
		}
		
	    }
	    request.onerror = function (e) {
		console.error(request.statusText);
		throw "error:"+request.statusText;
	    };
	    //console.log("sending:"+params);
	    jchaos.ops_on_going++;
	    request.send(params);
	    //  request.close();
	    
	}
	jchaos.addLongKey=function(obj,key,valuestr){
	    if(obj[key]== undefined){
		var tt={}
		tt['$numberLong']=valuestr;
		obj[key]=tt;
	    }
	}
	jchaos.getLongLong=function(obj,key){
	    return parseInt(obj[key].$numberLong);
	}
	jchaos.setLongLong=function(obj,key,val){
	    obj[key].$numberLong=val.toString();
	}
	jchaos.registerCU=function(cuid,obj,handleFunc){
	    var str_url_cu = "/api/v1/producer/jsonregister/"+cuid;
	    var dd=Date.now();
	    jchaos.addLongKey(obj,'dpck_ats',dd.toString());
	    jchaos.addLongKey(obj,'dpck_seq_id',"0");		
	    jchaos.basicPost(str_url_cu,JSON.stringify(obj),function(datav){handleFunc(datav);});
	}
	
	jchaos.pushCU=function(cuid,obj,handleFunc){
	    var str_url_cu = "/api/v1/producer/jsoninsert/"+cuid;
	    var dd=Date.now();
	    jchaos.setLongLong(obj,'dpck_seq_id',jchaos.getLongLong(obj,'dpck_seq_id') +1);
	    jchaos.basicPost(str_url_cu,JSON.stringify(obj),function(datav){handleFunc(datav);});
	}
	jchaos.mdsBase=function(cmd,opt,handleFunc){
	    var param="cmd="+cmd+"&parm="+JSON.stringify(opt);
	    jchaos.basicPost("MDS",param,function(datav){handleFunc(datav);});
	}
	
	jchaos.snapshot=function(_name,_what,_node_list,value_,handleFunc){
            var opt={};
            if(_name instanceof Array){
                opt['names']=_name;
            } else {
                opt['name']=_name;
            }
            opt['what']=_what;
            if(_node_list instanceof Array){
                opt['node_list']=_node_list;
            }
            
            try{
                JSON.parse(value_);
                opt['value']=value_;

            } catch(e){
                
            }
            
	    return jchaos.mdsBase("snapshot",opt,handleFunc);
	}
	
        jchaos.node=function(_name,_what,_type,_parent,value_,handleFunc){
            var opt={};
            if(_name instanceof Array){
                opt['names']=_name;
            } else {
                opt['name']=_name;
            }
            opt['what']=_what;
            opt['type']=_type;
            opt['parent']=_parent;

            
            try{
                JSON.parse(value_);
                opt['value']=value_;

            } catch(e){
                
            }
            
	    return jchaos.mdsBase("node",opt,handleFunc);
	}
        
        
        jchaos.variable=function(_name,_what,value_,handleFunc){
            var opt={};
            if(_name instanceof Array){
                opt['names']=_name;
            } else {
                opt['name']=_name;
            }
            opt['what']=_what;
            
            try{
                JSON.parse(value_);
                opt['value']=value_;

            } catch(e){
                
            }
            
	    return jchaos.mdsBase("variable",opt,handleFunc);
	}
        
        jchaos.log=function(_name,_what,_type,_start,_end,handleFunc){
            var opt={};
            if(_name instanceof Array){
                opt['names']=_name;
            } else {
                opt['name']=_name;
            }
            opt['what']=_what;
            opt['type']=_type;
            opt['start']=_start;
            opt['end']=_end;
                        
	    return jchaos.mdsBase("log",opt,handleFunc);
	}
        
        jchaos.search=function(_name,_what,_alive,handleFunc){
	    var opt={
		name:_name,
		what:_what,
		alive:_alive
	    };
	    return jchaos.mdsBase("search",opt,handleFunc);
	}
        jchaos.convertArray2CSV=function(devs){
           var dev_array="";
           if(devs instanceof Array){
		devs.forEach(function(elem,i,array){
		    if(i<(array.length-1)){
			dev_array+=elem + ",";
		    } else {
			dev_array+=elem ;
		    }
		});
	    } else {
		dev_array=devs;
	    }
            
            
            return dev_array;
        }
        
	jchaos.getChannel=function(devs,channel_id,handleFunc){
	    
	    var dev_array=jchaos.convertArray2CSV(devs);
	    
            if(dev_array==""){
                throw "must specify target(s) devices";
                return;
            }
	    var str_url_cu = "dev="+ dev_array + "&cmd=channel&parm="+channel_id;
	    //	console.log("query:"+str_url_cu);
	    jchaos.basicPost("CU",str_url_cu,function(datav){jchaos.lastChannel=datav;handleFunc(datav);});
	}
        jchaos.getHistory=function(devs,channel,start,stop,varname,handleFunc){
            var result={
                X:[],
                Y:[]
            };
            var opt={};
            //var regex=/^[0-9]+$/;
            if(!isNaN(start)){
                opt['start']=Number(start);
            } else {
                opt['start']=start;

            }
            if(!isNaN(stop)){
               opt['end']=Number(stop);

            } else {
                opt['end']=stop;
            }
            opt['channel']=channel;
            opt['page']=jchaos.options.history_page_len;
            opt['var']=varname;
            opt['uid']=0;
            
            jchaos.getHistoryBase(devs,opt,0,result,handleFunc);
  
        }
        

	jchaos.getHistoryBase=function(devs,opt,uid,result,handleFunc){
	    var cmd="";
	    var dev_array=jchaos.convertArray2CSV(devs);
	   
	    if(uid==0){
		cmd="queryhst";
	    } else {
		cmd="queryhstnext";
	    }
	    opt['uid']=uid;
            var str_url_cu = "dev="+ dev_array + "&cmd="+cmd+"&parm="+JSON.stringify(opt);
	    
	    jchaos.basicPost("CU",str_url_cu,function(datav){
		if(datav.uid>0){
		    jchaos.getHistoryBase(devs,opt,datav.uid,result,handleFunc);
		}
		if(opt.var!=""){
			/*
		    for(ele in datav.data){
			result.X.push(Number(ele.ts.$numberLong));
			result.Y.push(ele.val);
		    }*/
			datav.data.forEach(function(ele){
				result.X.push(Number(ele.ts));
				result.Y.push(ele.val);
			});
		} else {
		 /*   for(ele in datav.data){
			result.X.push(Number(ele.dpck_ats.$numberLong));
			result.Y.push(ele.val);
		    }*/
			datav.data.forEach(function(ele){
				result.X.push(Number(ele.dpck_ats.$numberLong));
				result.Y.push(ele.val);
			});
		    
		}
		if(jchaos.options.updateEachCall){
		    handleFunc(result);
		} else {
		    if(!(datav.uid>0)){
			// update if 0 or something else
			handleFunc(result);

		    }
		}
		
	    });
	}
	
	return jchaos;
    }
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined'){

	
	module.exports = createLibrary();
	
    } else{
	window.jchaos = createLibrary();
    }
}).call(this);
