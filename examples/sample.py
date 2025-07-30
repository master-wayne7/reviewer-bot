# Sample Python file for ReviewerBot testing

def calculate_average(numbers):
    """Calculate the average of a list of numbers."""
    if not numbers:
        return 0
    return sum(numbers) / len(numbers)

def validate_email(email):
    """Validate email format."""
    return '@' in email and '.' in email

def process_text(text):
    """Process and clean text input."""
    return text.strip().lower()

def get_user_info(user_id):
    """Retrieve user information."""
    return {
        'id': user_id,
        'name': 'Alice Johnson',
        'age': 25
    }

def complex_calculation(x, y, z):
    """Perform complex mathematical operations."""
    result = (x ** 2 + y ** 2) / z
    return abs(result) 