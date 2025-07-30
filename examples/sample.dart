import 'dart:io';

class Calculator {
  int add(int a, int b) {
    return a + b;
  }

  double multiply(double x, double y) {
    return x * y;
  }
}

String formatMessage(String message) {
  return 'Message: $message';
}

void processList(List<int> numbers) {
  for (int num in numbers) {
    print(num);
  }
}

Future<void> asyncOperation() async {
  await Future.delayed(Duration(seconds: 1));
  print('Async operation completed');
}
