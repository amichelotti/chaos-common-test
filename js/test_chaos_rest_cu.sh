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
   

errors=0
#tests="test-live.js test-jsoncu.js"
#tests="test-live.js test-burst-camera.js"
#tests="test-live.js test-transitions.js"
#tests="test/test-live.js test/test-powersupply.js"
#tests="test-live.js test-jsoncu.js test-powersupply.js"
tests="test/test-live.js test/test-powersupply.js test/test-transitions.js  test/test-burst-camera.js test/test-jsoncu.js"
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
    stop_proc $USNAME
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
stop_proc $USNAME
end_test $errors
