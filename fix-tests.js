const fs = require('fs');
const path = require('path');

const testFiles = [
    'sellerAuth.test.js',
    'cart.test.js', 
    'wishlist.test.js',
    'payment.test.js',
    'orders.test.js',
    'profile.test.js',
    'wallet.test.js',
    'ai.test.js',
    'chatbot.test.js',
    'customGift.test.js'
];

const testFixes = {
    // Replace imports
    'const app = require(\'./testApp\');': 'const app = require(\'../index\');',
    'const app = require(\'../testApp\');': 'const app = require(\'../index\');',
    
    // Add env setup at top
    'const request = require(\'supertest\');': 'process.env.NODE_ENV = \'test\';\nrequire(\'dotenv\').config({ path: \'.env.test\' });\n\nconst request = require(\'supertest\');',
    
    // Add mongoose import
    'const jwt = require(\'jsonwebtoken\');': 'const jwt = require(\'jsonwebtoken\');\nconst mongoose = require(\'mongoose\');'
};

testFiles.forEach(file => {
    const filePath = path.join(__dirname, 'tests', file);
    
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Apply fixes
        Object.entries(testFixes).forEach(([oldStr, newStr]) => {
            content = content.replace(oldStr, newStr);
        });
        
        // Add beforeEach and afterAll if not present
        if (!content.includes('beforeEach(async () => {')) {
            content = content.replace('describe(\'', 'beforeEach(async () => {\n        await mongoose.connection.dropDatabase();\n    });\n    \n    afterAll(async () => {\n        await mongoose.connection.close();\n    });\n\n    describe(\'');
        }
        
        fs.writeFileSync(filePath, content);
        console.log(`Fixed: ${file}`);
    } else {
        console.log(`Not found: ${file}`);
    }
});

console.log('Test fixes completed!');
