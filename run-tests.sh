#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== AGO WASH Backend Testing Script ===${NC}"

# Check if the server is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}A server is already running on port 3000. Using existing server.${NC}"
    SERVER_RUNNING=true
else
    echo -e "${BLUE}Starting the backend server...${NC}"
    # Start the server in the background
    node src/index.js > server.log 2>&1 &
    SERVER_PID=$!
    SERVER_RUNNING=false
    
    # Wait for the server to start
    echo -e "${BLUE}Waiting for server to start...${NC}"
    sleep 5
fi

# Run the setup script to create mock data
echo -e "${BLUE}Setting up mock data...${NC}"
node setup-mock-data.js

# Run the unit tests
echo -e "${BLUE}Running unit tests...${NC}"
npm test

# Run the manual tests
echo -e "${BLUE}Running manual tests...${NC}"
node test-manual.js

# If we started the server, shut it down
if [ "$SERVER_RUNNING" = false ] ; then
    echo -e "${BLUE}Shutting down the server...${NC}"
    kill $SERVER_PID
    wait $SERVER_PID 2>/dev/null
fi

# Display test report summary
if [ -f "test-report.json" ]; then
    echo -e "${BLUE}=== Test Report Summary ===${NC}"
    PASSED=$(jq '.summary.passed' test-report.json)
    FAILED=$(jq '.summary.failed' test-report.json)
    TOTAL=$(jq '.summary.total' test-report.json)
    
    echo -e "${GREEN}Passed: $PASSED${NC}"
    echo -e "${RED}Failed: $FAILED${NC}"
    echo -e "${BLUE}Total: $TOTAL${NC}"
    
    echo -e "${BLUE}See test-report.json for detailed results${NC}"
else
    echo -e "${RED}Test report not found. Tests may have failed to run.${NC}"
fi

echo -e "${BLUE}=== Testing Complete ===${NC}"
