#!/bin/sh
if [ "$NODE_ENV" = "production" ]; then
  echo "Running in production mode"
  npm run build
  npm start
else
  echo "Running in development mode"
  npm start
fi
