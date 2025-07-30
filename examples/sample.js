// Sample JavaScript file for ReviewerBot testing

function calculateTip(amount, percentage) {
    return amount * (percentage / 100);
}

const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
};

let validateInput = (input) => {
    return input && input.trim().length > 0;
};

var processData = function(data) {
    return data.map(item => item.toUpperCase());
};

function complexAlgorithm(a, b, c) {
    let result = 0;
    for (let i = 0; i < a; i++) {
        result += b * c;
    }
    return result;
}

const getUserProfile = (userId) => {
    return {
        id: userId,
        name: "Jane Smith",
        email: "jane@example.com"
    };
}; 