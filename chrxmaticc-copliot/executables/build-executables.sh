#!/bin/bash
# Build all Chrxmaticc Copilot executables
# Requires: npm install -g pkg

echo "Building Chrxmaticc Copilot executables..."
echo ""

echo "Windows (.exe)..."
pkg bin/copilot.js --targets node18-win-x64 --output executables/chrxmaticc-copilot.exe
echo "✓ Windows done"

echo "macOS..."
pkg bin/copilot.js --targets node18-macos-x64 --output executables/chrxmaticc-copilot-macos
echo "✓ macOS done"

echo "Linux..."
pkg bin/copilot.js --targets node18-linux-x64 --output executables/chrxmaticc-copilot-linux
echo "✓ Linux done"

echo ""
echo "All executables built in executables/"
ls -la executables/
