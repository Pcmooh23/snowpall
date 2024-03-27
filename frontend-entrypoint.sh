#!/bin/sh
if [ "$NODE_ENV" = "production" ]; then
  echo "Running in production mode"
  npm run build
else
  echo "Running in development mode"
  npm start
fi
