const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Running Test Suite...\n');

try {
    // Check if tests directory exists
    const testsDir = path.join(__dirname, 'tests');
    if (!fs.existsSync(testsDir)) {
        console.error('❌ Tests directory not found!');
        process.exit(1);
    }

    // List test files
    const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.js'));
    console.log(`📁 Found ${testFiles.length} test files:`);
    testFiles.forEach(file => console.log(`   - ${file}`));
    console.log('');

    // Run tests with timeout
    console.log('🧪 Running tests...');
    const result = execSync('npx jest --detectOpenHandles --forceExit --verbose', { 
        stdio: 'inherit',
        timeout: 30000 // 30 second timeout
    });

    console.log('\n✅ All tests completed!');
    
} catch (error) {
    console.error('\n❌ Test execution failed:');
    console.error(error.message);
    
    if (error.status === 1) {
        console.log('\n💡 Some tests failed - check the output above for details');
    } else if (error.signal === 'SIGTERM') {
        console.log('\n⏱️ Tests timed out - check for hanging operations');
    }
    
    process.exit(1);
}
