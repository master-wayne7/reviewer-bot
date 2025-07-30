#include <iostream>
#include <vector>
#include <string>

class Calculator
{
public:
    int add(int a, int b)
    {
        return a + b;
    }

    double multiply(double x, double y)
    {
        return x * y;
    }
};

std::string formatMessage(const std::string &message)
{
    return "Message: " + message;
}

void processVector(std::vector<int> &numbers)
{
    for (int num : numbers)
    {
        std::cout << num << " ";
    }
    std::cout << std::endl;
}