cmake_minimum_required(VERSION 2.6)
IF (DEFINED ENV{CHAOS_BUNDLE} )
  include($ENV{CHAOS_BUNDLE}/tools/project_template/CMakeChaos.txt)
ELSE()
  MESSAGE(STATUS "STANDALONE, environment CHAOS_BUNDLE defined")
  IF (NOT CMAKE_INSTALL_PREFIX) 
    MESSAGE(fatal "you must add -DCMAKE_INSTALL_PREFIX=<dir>")
  ELSE()
    MESSAGE(STATUS "install prefix ${CMAKE_INSTALL_PREFIX}")
  ENDIF()
  INCLUDE_DIRECTORIES(. ../..)
  LINK_DIRECTORIES(${CMAKE_BINARY_DIR}/build ${CMAKE_INSTALL_PREFIX}/lib)
ENDIF()




#### put your libcommon_test LIBRARY files here
SET(test_src CUTestReport.cpp CUTest.cpp )
###
IF(BUILD_FORCE_STATIC)
ADD_LIBRARY(common_test STATIC ${test_src})
ELSE()
ADD_LIBRARY(common_test SHARED ${test_src})
ENDIF()

TARGET_LINK_LIBRARIES(common_test chaos_cutoolkit
	chaos_common boost_program_options boost_system boost_thread
	boost_chrono boost_regex boost_log boost_log_setup
	boost_atomic memcached)

FILE(GLOB headers "*.h" )
INSTALL(FILES ${headers} DESTINATION include/common/test)

INSTALL_TARGETS(/lib  common_test)

