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
if launch_us_cu 1 52 "" $USNAME TEST 1;then
	if ! check_proc $USNAME;then
	    error_mesg "$USNAME quitted"
	    end_test 1 "$USNAME quitted"
	fi
    else
	
    	error_mesg "registration failed"
	stop_proc $USNAME
	end_test 1 "registration failed"
    fi

# info_mesg "waiting " " 20s"
# sleep 20

if ./node_modules/mocha/bin/mocha;then
    ok_mesg "mocha unit server tests"
    stop_proc $USNAME
    end_test 0
else
    stop_proc $USNAME
    nok_mesg "REST tests"
    end_test 1 "REST tests"
fi

