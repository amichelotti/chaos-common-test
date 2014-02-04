//
//  CUTestReport.cpp
//  test
//
//  Created by andrea michelotti on 30/01/14.
//  Copyright (c) 2014 andrea michelotti. All rights reserved.
//

#include "CUTestReport.h"
#include <fstream>
void CUTestReport::toCSV(char *filename){
    std::fstream st;
    st.open(filename,std::fstream::out);
    if(st.good()){
        toCSV(st);
        st.close();
    }
}

void CUTestReport::toCSV(std::iostream& st ){
    std::vector<std::pair<std::string,TestOutput> >::iterator ito;
    st<<"test name,#executions,#errors,duration us,result"<<std::endl;
    for(ito=to.begin();ito!=to.end();ito++){
        st<<ito->first<<","<<ito->second.repeat<<","<<ito->second.errors<<","<<ito->second.us_duration<<","<<ito->second.result<<std::endl;
    }
    st<<std::endl;
    
    
   
}

void CUTestReport::insert(std::string k,TestOutput t){
    to.push_back(std::make_pair(k,t));
    
}
