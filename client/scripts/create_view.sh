#!/bin/bash

if [ "$#" -ne 1 ]; then
	echo "Please provide a file name"
else
cat <<FILE > "templates/$1.njk"
{%include "layout.njk"%}
{%block content%}
{%endblock%}
FILE

echo "created templates/$1.njk"
fi
