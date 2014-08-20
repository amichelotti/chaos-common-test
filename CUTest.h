//
//  CUTest.h
//  test
//
//  Created by andrea michelotti on 29/01/14.
//  Copyright (c) 2014 andrea michelotti. All rights reserved.
//



#ifndef __test__CUTest__
#define __test__CUTest__
#include <iostream>
#include <boost/thread.hpp>
#include <vector>
#include <map>
#include <common/debug/debug.h>
#include <boost/date_time/posix_time/posix_time.hpp>
#undef CHAOSFramework_UIToolkitCWrapper_h
#include <chaos/ui_toolkit/ChaosUIToolkitCWrapper.h>
#include "CUTestReport.h"

template <class T>
class CUTest {
protected:
    unsigned int devID;
    std::string cu_name;
    long test_timeo;
public:
    

    typedef int (T::*cutestfn)(void* pn);
    typedef int (T::*cutestfn0)(void);

    struct testfn {
        T* c;
        cutestfn fn;
        cutestfn0 fn0;
        long timeo;
        int repeat;
        void* priv;
        struct TestOutput to;
        testfn(T* _c,cutestfn _fn,cutestfn0 _fn0,int _timeo,int _repeat,void*param=0):c(_c),fn(_fn),fn0(_fn0),timeo(_timeo),repeat(_repeat),priv(param){
        };
        testfn(){c=NULL;fn=NULL;timeo=0;repeat=1;priv=NULL;fn0=NULL;}
    };
    
    std::vector<std::pair<std::string,testfn> > test;
    // running test
    typename std::vector<std::pair<std::string,testfn> >::iterator itest_running;
    boost::thread th;
    int running;
public:
    CUTest(std::string cuname):cu_name(cuname){
        running = 0;        
    }

    
    template<typename TT>
    void addTest(std::string tname,T*t,int (T::*fn)(TT*p),TT param,int timeo,int rep){
        TT* newparam=new TT;
        assert(newparam!=NULL);
        *newparam = param;
        test.push_back(std::make_pair(tname,testfn(t,(cutestfn)fn,NULL,timeo,rep,newparam)));
        
    }
    
    void addTest(std::string tname,T*t,cutestfn0 fn,int timeo,int rep){
        test.push_back(std::make_pair(tname,testfn(t,NULL,fn,timeo,rep,NULL)));
    
    }
    int init(){
        int err;
               
        
        err = getNewControllerForDeviceID(cu_name.c_str(), &devID);
        if (err != 0) {
            DPRINT("Error getNewControllerForDeviceID for CU \"%s\" devID @x%x err: %d\n", cu_name.c_str(),devID,err);
            return -2;
        }
        
        err = setControllerTimeout((uint32_t)devID, 5000);
        if (err != 0) {
            DPRINT("Error setting error %d\n", err);
            return -1;
        }
        err = stopDevice(devID);
        if (err != 0) {
            DPRINT("Error setting stopping device error %d\n", err);
            return -1;
        }
        err=deinitDevice(devID);
        if (err != 0) {
            DPRINT("Error setting deinit device error %d\n", err);
            return -1;
        }
        
        return 0;
    }

    void remTest(std::string tname){
        typename std::vector<std::pair<std::string,testfn> >::iterator itest;
        for(itest = test.begin();itest!=test.end();itest++){
            if(itest->first == tname){
                test.erase(itest);
            }
        }
    }
    
   
    int initTest(){
        int err;
        err = initDevice(devID);
        if (err != 0) {
            DPRINT("Error initDevice %d\n", err);
            return -1;
        }
        return 0;
    }
   
    int startTest(){
        int err;
        err = startDevice(devID);
        if (err != 0) {
            DPRINT("Error startingDevice %d\n", err);
            return -1;
        }
        return 0;
    }
    
 
    int stopTest(){
        int err;
        err = stopDevice(devID);
        if (err != 0) {
            DPRINT("Error stopDevice %d\n", err);
            return -1;
        }
        return 0;
    }
    
 
    int deinitTest(){
        int err;
        err = deinitDevice(devID);
        if (err != 0) {
            DPRINT("Error deinitDevice %d\n", err);
            return -1;
        }
        return 0;
    }
  
    int aliveTest(){
        int err;
        long long live=0,old_live=0;
        boost::posix_time::ptime start=boost::posix_time::microsec_clock::local_time();
        while((((live == old_live)|| (live == 0 ) || old_live ==0))&& ((test_timeo==0)|| ((boost::posix_time::microsec_clock::local_time() - start).total_microseconds() <  test_timeo*1000))){
            err = fetchLiveData(devID);
            old_live = live;
            err= getTimeStamp(devID,(uint64_t*)&live);
            if(err!=0) return err;
            //   DPRINT("alive returned %lld (%s) ret %d\n",live,boost::posix_time::to_simple_string(boost::posix_time::seconds(live)).c_str(),err);
        }
        DPRINT("alive test live %llu old live %llu time %llu, err %d\n",live,old_live,(boost::posix_time::microsec_clock::local_time() - start).total_microseconds(),err);
        if(old_live!=live) return 0;
        return -1;
    }
    // return 0 if everithing ok
    
    void runTestsBackGround(int runall,int loop=1){
        if(running){
            DERR("Test already running");
            return;
        }
        th = boost::thread(&CUTest::runTests,this,runall,loop);
        
    }
  
    int report(CUTestReport& tr){
        typename std::vector<std::pair<std::string,testfn> >::iterator itest;
        th.join();
        
        for(itest =test.begin();itest!=test.end();itest++){
            tr.insert(itest->first,itest->second.to);
            tr.errors += itest->second.to.result?1:0;
        }
        
        return tr.errors;
    }
 
    int report(char*filename){
        int cnt;
        CUTestReport tr;
        cnt = report(tr);
        tr.toCSV(filename);
        return cnt;
    }
    // run all the tests the index of the failing test
  
    int runTests(int runall,int loop){
        int errors=0;
        int cnt_test=0;
        boost::posix_time::ptime test_start = boost::posix_time::microsec_clock::local_time();
        while(loop--){
            itest_running = test.begin();

        running = 1;
        while(itest_running!=test.end()){
            int rep = itest_running->second.repeat;
            long timeo_ms = itest_running->second.timeo;
            itest_running->second.to.result = 0;
            itest_running->second.to.us_duration =0;
            itest_running->second.to.repeat=0;
            boost::posix_time::ptime start=boost::posix_time::microsec_clock::local_time();
	    PRINT("- %d Executing test \"%s\" %d\n",cnt_test,itest_running->first.c_str(),rep);
            while(rep-->0 && ((timeo_ms==0) || ((timeo_ms!=0)&&((boost::posix_time::microsec_clock::local_time()-start) < boost::posix_time::microsec(timeo_ms*1000))))){
                int ret;
                long long duration;
                if(timeo_ms>0){
                    setControllerTimeout((uint32_t)devID, timeo_ms);
                    test_timeo = timeo_ms;
                }
                boost::posix_time::ptime start=boost::posix_time::microsec_clock::local_time();
                
                DPRINT("Starting test \"%s\" %d/%d at %10llu us\n",itest_running->first.c_str(),itest_running->second.repeat - rep,itest_running->second.repeat,(boost::posix_time::microsec_clock::local_time()- test_start).total_microseconds());
                
                //funct(itest_running->second.priv);
                T* p =itest_running->second.c;
                
                if(itest_running->second.fn0){
                     cutestfn0 f =itest_running->second.fn0;
                     ret = (p->*f)();
                    // ret = (p->*itest_running->second.fn0)();
                } else if (itest_running->second.fn){
                    cutestfn f =itest_running->second.fn;
                     ret = (p->*f)(itest_running->second.priv);
                } else {
                    DERR("bad test function %s\n",itest_running->first.c_str());
                    break;
                }
                
                
                if(ret){
                    errors++;
                    itest_running->second.to.errors++;
                }
                itest_running->second.to.result =ret;
                duration =(boost::posix_time::microsec_clock::local_time()- start).total_microseconds();
                itest_running->second.to.us_duration+=duration;
                itest_running->second.to.repeat++;
                DPRINT("End test \"%s\" duration %10llu us result =%d\n",itest_running->first.c_str(),duration,ret);

		
                if(!runall && errors) {
                    running =0;
                    return cnt_test;
                }
            }
	    PRINT("- %d END Test \"%s\" errs: %d, tot err: %d\n",cnt_test,itest_running->first.c_str(),itest_running->second.to.errors,errors);
            
            itest_running++;
            cnt_test++;
        }
        }
        running =0;
        return errors;
        
    }
    
    std::string getCUname(){return cu_name;}

    
    ~CUTest(){
        running = 0;
        for(itest_running=test.begin();itest_running!=test.end();itest_running++){
            if(itest_running->second.priv!=NULL){
                delete itest_running->second.priv;
                itest_running->second.priv = NULL;
            }
        }
    }

 };

#endif /* defined(__test__CUTest__) */
