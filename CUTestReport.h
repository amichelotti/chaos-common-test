//
//  CUTestReport.h
//  test
//
//  Created by andrea michelotti on 30/01/14.
//  Copyright (c) 2014 andrea michelotti. All rights reserved.
//

#ifndef __test__CUTestReport__
#define __test__CUTestReport__

#include <iostream>
#include <vector>
#include <iostream>

struct TestOutput {
    long repeat;
    long long us_duration;
    long errors;
    int result;
    TestOutput(){repeat = 0;us_duration=0; errors = 0;result=0;}
};

class CUTestReport {
    
    protected:
    std::vector<std::pair<std::string,TestOutput> > to;
    template<typename T>
    friend class CUTest;
    int errors;
public:
    CUTestReport(){errors =0;};
    
    // return the number of failing tests
    int getErrors(){return errors;}
    void insert(std::string,TestOutput to);
    void toCSV(char *filename);
    void toCSV(std::iostream& st );
    
};
#endif /* defined(__test__CUTestReport__) */
