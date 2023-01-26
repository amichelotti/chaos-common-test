cmake_minimum_required(VERSION 2.9)
project(common_test)
find_package(Boost MODULE REQUIRED REQUIRED COMPONENTS program_options system)
include_directories(../.. ${Boost_INCLUDE_DIRS})
#### put your libcommon_test LIBRARY files here
SET(test_src CUTestReport.cpp CUTest.cpp )
###
ADD_LIBRARY(${PROJECT_NAME} STATIC ${test_src})

TARGET_LINK_LIBRARIES(${PROJECT_NAME} chaos_cutoolkit
	chaos_common boost_program_options boost_system boost_thread
	boost_chrono  boost_log boost_log_setup
	boost_atomic)

FILE(GLOB headers "*.h" )
INSTALL(FILES ${headers} DESTINATION include/common/test)

INSTALL(DIRECTORY js DESTINATION tools/test PATTERN "*" PERMISSIONS OWNER_EXECUTE OWNER_WRITE OWNER_READ GROUP_EXECUTE GROUP_READ)
INSTALL(TARGETS ${PROJECT_NAME}
        DESTINATION "lib"
        PERMISSIONS OWNER_WRITE OWNER_READ OWNER_EXECUTE GROUP_READ GROUP_WRITE GROUP_EXECUTE WORLD_READ WORLD_EXECUTE)

