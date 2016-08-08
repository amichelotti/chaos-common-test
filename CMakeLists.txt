cmake_minimum_required(VERSION 2.8)
project(common_test)

#### put your libcommon_test LIBRARY files here
SET(test_src CUTestReport.cpp CUTest.cpp )
###
ADD_LIBRARY(${PROJECT_NAME} STATIC ${test_src})

TARGET_LINK_LIBRARIES(${PROJECT_NAME} chaos_cutoolkit
	chaos_common boost_program_options boost_system boost_thread
	boost_chrono boost_regex boost_log boost_log_setup
	boost_atomic)

FILE(GLOB headers "*.h" )
INSTALL(FILES ${headers} DESTINATION include/common/test)

INSTALL_TARGETS(/lib  ${PROJECT_NAME})

