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
echo "1512080677 1277.13 836.85 0.0 84800.0 1 106 FFFFFFFF FFFFFFFF FFFFFFFF FFC00000 106 FFFFFFFF FFFFFFFF FFFFFFFF FFC00000 3 2 2 210258 0 -1 5.33e+00 1.67e+02 0 368667000 0.000 0.000 5201.4 0.0 1 0 0.000 0.000 0.000 0.000 -3.550 -0.370 -2.940 -0.510 -1.720 -0.470 1.360 0.490 20.33 1770.00 18.90 20.89 1.842 1.782 -0.745 1.520 " > newdafne.stat

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
errors=0
# tests="test-live.js test-jsoncu.js test-powersupply.js test-transitions.js"
tests="test-live.js test-jsoncu.js test-powersupply.js"
for t in $tests;do
if ./node_modules/mocha/bin/mocha test/$t;then
    ok_mesg "mocha unit server test $t"

else
    stop_proc $USNAME
    nok_mesg "mocha unit server test $t"
    ((errors++))
fi

done
stop_proc $USNAME
end_test $errors
