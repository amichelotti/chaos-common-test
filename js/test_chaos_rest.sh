source $CHAOS_TOOLS/common_util.sh
start_test
info_mesg "REST tests" " $0"
if ! which node>&/dev/null;then
    if which nodejs >& /dev/null;then
	info_mesg "nodejs " "found"
    else
	end_test 1 "nodejs not found"
    fi

    ln -sf `which nodejs` node
    export PATH=$PATH:.
fi
export USNAME=UnitServer
if ! check_proc mds ;then
    nok_mesg "mds running"
    end_test 1 "mds dead"
fi
if launch_us_cu 1 100 $CHAOS_MDS $USNAME TEST 1;then
	if ! check_proc $USNAME;then
	    error_mesg "$USNAME quitted"
	    end_test 1 "$USNAME quitted"
	fi
    else
	
    	error_mesg "registration failed"
	stop_proc $USNAME
	end_test 1 "registration failed"
    fi

info_mesg "waiting 10s ..."
sleep 10
tests="test-live.js test-powersupply.js"
for t in $tests;do
if ./node_modules/mocha/bin/mocha test/$t;then
    ok_mesg "mocha unit server test $t"
    stop_proc $USNAME
    end_test 0
else
    stop_proc $USNAME
    nok_mesg "mocha unit server test $t"
    end_test 1 "REST tests"
fi

done
