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
start_services || end_test 1 "cannot start services"


if [ -e "$CHAOS_TOOLS/../etc/localhost/MDSConfig.json" ];then
    MDS_TEST_CONF=$CHAOS_TOOLS/../etc/localhost/MDSConfig.json
    ok_mesg "found $MDS_TEST_CONF"
else
    nok_mesg "cannot find $CHAOS_TOOLS/etc/localhost/MDSConfig.json"
    end_test 1 "Cannot find MDS_TEST_CONF"
fi
   
info_mesg "using configuration " "$CHAOS_TOOLS/etc/localhost/MDSConfig.json"
if run_proc "$CHAOS_PREFIX/bin/ChaosMDSCmd --mds-conf $MDS_TEST_CONF $CHAOS_OVERALL_OPT >& $CHAOS_PREFIX/log/ChaosMDSCmd.log;" "ChaosMDSCmd"; then
    ok_mesg "Transfer test configuration \"$MDS_TEST_CONF\" to MDS"
else
    nok_mesg "Transfer test configuration \"$MDS_TEST_CONF\" to MDS"
    end_test 1 "trasfering configuration"
fi

export USNAME=UnitServer
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
#tests="test-live.js test-jsoncu.js"
#tests="test-live.js test-burst-camera.js"
#tests="test-live.js test-transitions.js"

#tests="test-live.js test-jsoncu.js test-powersupply.js"
tests="test/test-live.js test/test-transitions.js test/test-powersupply.js test/test-burst-camera.js test/test-jsoncu.js"
# for t in $tests;do
# if ./node_modules/mocha/bin/mocha --timeout 60000 test/$t  --reporter mochawesome  --reporter-options reportDir=html,reportFilename=$t ;then
#     ok_mesg "mocha unit server test $t"

# else
#     nok_mesg "mocha unit server test $t"
#     ((errors++))
#     stop_proc $USNAME
#     end_test $errors
    
# fi

#done

if ./node_modules/mocha/bin/mocha --timeout 60000 $tests  --reporter mochawesome  --reporter-options reportDir=html,reportFilename=test_rest;then
     ok_mesg "mocha unit server test "

 else
     nok_mesg "mocha unit server test"
     stop_proc $USNAME
     end_test $errors
    
 fi
mv html $CHAOS_PREFIX/log
stop_proc $USNAME
end_test $errors
