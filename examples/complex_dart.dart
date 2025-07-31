import 'dart:io';

class DataProcessor {
  // Simple function
  int add(int a, int b) {
    return a + b;
  }

  // Future with simple type
  Future<String> getData() async {
    await Future.delayed(Duration(seconds: 1));
    return "Hello World";
  }

  // Complex Future type - this is what you asked about
  Future<Map<String, List<int>>> getComplexData() async {
    await Future.delayed(Duration(seconds: 1));
    return {
      "numbers": [
        1,
        2,
        3,
        4,
        5
      ],
      "scores": [
        100,
        200,
        300
      ]
    };
  }

  // Another complex Future type
  Future<List<Map<String, dynamic>>> getUsers() async {
    await Future.delayed(Duration(seconds: 1));
    return [
      {
        "name": "Alice",
        "age": 25
      },
      {
        "name": "Bob",
        "age": 30
      }
    ];
  }

  // Future with nested generics
  Future<Map<String, Future<List<int>>>> getNestedData() async {
    await Future.delayed(Duration(seconds: 1));
    return {
      "async_numbers": Future.value([
        1,
        2,
        3
      ])
    };
  }
}

// Standalone functions
String formatMessage(String message) {
  return 'Message: $message';
}

Future<void> simpleAsync() async {
  await Future.delayed(Duration(seconds: 1));
  print('Done!');
}
