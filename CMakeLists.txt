cmake_minimum_required(VERSION 2.6)
option(BUILD_FORCE_32 "Set to ON to enable 32 bit compilation" OFF)


IF( ($ENV{CHAOS32}) OR (BUILD_FORCE_32) )
    MESSAGE(STATUS "Enabling 32 bit Compilation")
    set (CMAKE_C_FLAGS "-m32")
    set (CMAKE_CXX_FLAGS "-m32")
    set (CMAKE_LINK_FLAGS "-m32")
ENDIF()

if( DEFINED ENV{CHAOS_FRAMEWORK} ) 
    MESSAGE(STATUS "Using $ENV{CHAOS_FRAMEWORK}")
      set (PROJECT_SOURCE_DIR $ENV{CHAOS_FRAMEWORK})
ELSE()
    MESSAGE(FATAL_ERROR "Please set CHAOS_FRAMEWORK environment")
ENDIF()

set (CMAKE_INSTALL_PREFIX ${PROJECT_SOURCE_DIR}/usr/local)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/build)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/build)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/build)
     
INCLUDE_DIRECTORIES(. ${PROJECT_SOURCE_DIR}/usr/local/include)
LINK_DIRECTORIES(${PROJECT_SOURCE_DIR}/usr/local/lib)

ADD_DEFINITIONS(-g -O2 -Wall)


#### put your libcommon_test LIBRARY files here
SET(test_src CUTestReport.cpp CUTest.cpp )
###
ADD_LIBRARY(common_test SHARED ${test_src})

TARGET_LINK_LIBRARIES(common_test chaos_cutoolkit
	chaos_common boost_program_options boost_system boost_thread
	boost_chrono boost_regex boost_log boost_log_setup
	boost_atomic memcached msgpack msgpack-rpc mpio)

FILE(GLOB headers "*.h" )
INSTALL(FILES ${headers} DESTINATION include/common/test)

INSTALL_TARGETS(/lib  common_test)
