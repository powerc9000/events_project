#!/bin/bash

if [ "$#" -ne 1 ]; then
	echo "Please provide a file name"
else
touch "templates/$1.ejs"

echo "created templates/$1.ejs"
fi
