#!/bin/bash

# Build the client
cd client && npm run build

# Build the server
cd ..
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist