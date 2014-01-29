//
//  main.cpp
// created automatically
//
//
//  
//


#include "__template_name__.h"

using namespace common::__template_name__;
#include <boost/program_options.hpp>

int main(int argc, char *argv[])
{
  boost::program_options::options_description desc("options");
  desc.add_options()("help", "help");
  // put your additional options here

  //////
  boost::program_options::variables_map vm;
  boost::program_options::store(boost::program_options::parse_command_line(argc,argv, desc),vm);
  boost::program_options::notify(vm);
  
  if (vm.count("help")) {
    std::cout << desc << "\n";
    return 1;
  }  
  // test your lib__template_name__ library here

  return 0;
}
