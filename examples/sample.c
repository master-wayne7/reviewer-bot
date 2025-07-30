#include <stdio.h>
#include <stdlib.h>

int calculateSum(int a, int b)
{
    return a + b;
}

void printMessage(char *message)
{
    printf("%s\n", message);
}

float divideNumbers(float x, float y)
{
    if (y == 0)
    {
        return 0;
    }
    return x / y;
}