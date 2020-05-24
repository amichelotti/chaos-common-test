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
## checkout last jchaos
if npm install jchaos mocha;then
    ok_mesg "installed last jchaos from npm "
else
    error_mesg "cannot install jchaos from npm " "jchaos"
fi

## start WS external driver service
   
info_mesg "using configuration " "$MDS_TEST_CONF"

if [ -z $EXTERNAL_DRIVER_SERVER ];then
    rm -rf nodejs-external-driver-server-test
    git clone git@baltig.infn.it:chaos-lnf-control/nodejs-external-driver-server-test.git -b experimental
    cd nodejs-external-driver-server-test
    ./launch.sh
    cd -
else
    info_mesg "External driver on " "$EXTERNAL_DRIVER_SERVER"
    sed -i "s/ws\:\/\/localhost:8123/ws\:\/\/$EXTERNAL_DRIVER_SERVER:8123/" $MDS_TEST_CONF
fi



# if run_proc "$CHAOS_PREFIX/bin/ChaosMDSCmd --mds-conf $MDS_TEST_CONF $CHAOS_OVERALL_OPT >& $CHAOS_PREFIX/log/ChaosMDSCmd.log;" "ChaosMDSCmd"; then
#     ok_mesg "Transfer test configuration \"$MDS_TEST_CONF\" to MDS"
# else
#     nok_mesg "Transfer test configuration \"$MDS_TEST_CONF\" to MDS"
#     end_test 1 "trasfering configuration"
# fi
sleep 5

if ! $CHAOS_PREFIX/tools/chaos_services.sh start;then
    error_mesg "failed initialization of " "MDS"
    exit 1
fi
## load configuration
if ! $CHAOS_PREFIX/tools/chaos_services.sh config;then
    error_mesg "failed initialization of " "MDS"
    exit 1
fi


## load configuration
if ! $CHAOS_PREFIX/tools/chaos_services.sh start us;then
    error_mesg "failed starting " "TEST"
    exit 1
fi
## perform chaosRoot test
if ./node_modules/mocha/bin/mocha --timeout 60000 node_modules/jchaos/test/test-agent-root.js   --reporter mochawesome  --reporter-options reportDir=$CHAOS_PREFIX/log/html,reportFilename=$t ;then
    ok_mesg "mocha unit server test test/test-agent-root.js "

else
    nok_mesg "mocha unit server test test/test-agent-root.js "
    ((errors++))
    if ! $CHAOS_PREFIX/tools/chaos_services.sh stop us;then
        error_mesg "failed stopping  " "US"
    fi

    end_test $errors   
fi


###
info_mesg "waiting 20s ..."
sleep 20
errors=0
#tests="test-live.js test-jsoncu.js"
#tests="test-live.js test-burst-camera.js"
#tests="test-live.js test-transitions.js"
#tests="test/test-live.js test/test-powersupply.js"
#tests="test-live.js test-jsoncu.js test-powersupply.js"
tests="node_modules/jchaos/test/test-live.js node_modules/jchaos/test/test-powersupply.js node_modules/jchaos/test/test-transitions.js  node_modules/jchaos/test/test-burst-camera.js node_modules/jchaos/test/test-jsoncu.js"
#tests="test/test-live.js test/test-powersupply.js test/test-transitions.js  test/test-burst-camera.js test/test-jsoncu.js"
export WEBUI_SERVER="localhost:8081"
if [ -n "$CHAOS_WEBUI" ];then
    export WEBUI_SERVER=$CHAOS_WEBUI
    info_mesg "setting SERVER to:" "$WEBUI_SERVER"
fi
for t in $tests;do
if ./node_modules/mocha/bin/mocha --timeout 60000 $t  --reporter mochawesome  --reporter-options reportDir=$CHAOS_PREFIX/log/html,reportFilename=$t ;then
    ok_mesg "mocha unit server test $t"

else
    nok_mesg "mocha unit server test $t"
    ((errors++))
    if ! $CHAOS_PREFIX/tools/chaos_services.sh stop us;then
        error_mesg "failed stopping  " "US"
    fi

    end_test $errors   
fi
done

# if ./node_modules/mocha/bin/mocha --timeout 60000 $tests  --reporter mochawesome  --reporter-options reportDir=$CHAOS_PREFIX/log/html,reportFilename=test_rest;then
#      ok_mesg "mocha unit server test "

#  else
#      nok_mesg "mocha unit server test"
#      stop_proc $USNAME
#      ((errors++))
#      end_test $errors
     
#  fi

if ! $CHAOS_PREFIX/tools/chaos_services.sh stop us;then
    error_mesg "failed stopping  " "US"
fi

end_test $errors
