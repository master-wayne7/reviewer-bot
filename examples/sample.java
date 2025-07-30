import java.util.List;
import java.util.ArrayList;

public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }
    
    public double multiply(double x, double y) {
        return x * y;
    }
    
    private String formatMessage(String message) {
        return "Message: " + message;
    }
}

class StringProcessor {
    public static void processList(List<String> items) {
        for (String item : items) {
            System.out.println(item);
        }
    }
    
    protected boolean isValid(String input) {
        return input != null && !input.trim().isEmpty();
    }
} 