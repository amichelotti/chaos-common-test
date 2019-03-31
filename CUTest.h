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
#include <common/debug/core/debug.h>
#include <boost/date_time/posix_time/posix_time.hpp>

#include <chaos_metadata_service_client/ChaosMetadataServiceClient.h>

#include "CUTestReport.h"
#if 0
#define PERFORM_CMD(x,y) \
    err=controller->x (y);

#else
#define PERFORM_CMD(x,y) \
    err=controller->x (y);\
    if(err==chaos::ErrorCode::EC_TIMEOUT){  CHAOS_EXCEPTION(err,"Timeout performing " # x "() on "+cu_name);}\
    if(err!=0){  CHAOS_EXCEPTION(err,"Error performing " # x "() on "+cu_name);}
#endif
template <class T>
class CUTest {
protected:
    unsigned int devID;
    std::string cu_name;
    long test_timeo;
    chaos::metadata_service_client::node_controller::CUController* controller;

    chaos::CUStateKey::ControlUnitState device_state;

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
        int err;
        running = 0;

        chaos::metadata_service_client::ChaosMetadataServiceClient::getInstance()->getNewCUController(cuname,&controller);
   
 
        controller->setRequestTimeWaith(5000000);
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
        int retry=20;
        if(!controller) {
            CHAOS_EXCEPTION(-1,"MDS does not retrieved a valid controller for: "+cu_name);
            return -1;
        }
        do {
            PERFORM_CMD(getState,device_state);

/*            err = controller->getState(device_state);
            if(err == ErrorCode::EC_TIMEOUT){
                CHAOS_EXCEPTION(-1,"Timeout getting state: "+cu_name);
            }
  */
            if(device_state == chaos::CUStateKey::DEINIT){
                PERFORM_CMD(initDevice,);
            } else if(device_state == chaos::CUStateKey::START){
                PERFORM_CMD(stopDevice,);
            } else if(device_state == chaos::CUStateKey::STOP){
                PERFORM_CMD(deinitDevice,);
            }
            PRINT("%d] device state:%d\n",retry,device_state);
            sleep(1);
        } while((device_state!= chaos::CUStateKey::INIT)&& retry-- > 0);


        if(retry>0){
            PRINT("init state reached");
            return 0;
        }
        DERR("cannot force in init state");
        return -5;
        //print_state(device_state);

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
        PERFORM_CMD(initDevice,);
        return 0;
    }

    int startTest(){
        int err;
        PERFORM_CMD(startDevice,);
        return 0;
    }


    int stopTest(){
        int err;
        PERFORM_CMD(stopDevice,);
        return 0;
    }


    int deinitTest(){
        int err;
        PERFORM_CMD(deinitDevice,);
        return 0;
    }

    int aliveTest(){
        int err;
        uint64_t live=0,old_live=0;
        boost::posix_time::ptime start=boost::posix_time::microsec_clock::local_time();
        while((((live == old_live)|| (live == 0 ) || old_live ==0))&& ((test_timeo==0)|| ((boost::posix_time::microsec_clock::local_time() - start).total_microseconds() <  test_timeo*1000))){
            controller->fetchCurrentDeviceValue();
            old_live = live;
            err= controller->getTimeStamp(live);
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
               //     setControllerTimeout((uint32_t)devID, timeo_ms);
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
