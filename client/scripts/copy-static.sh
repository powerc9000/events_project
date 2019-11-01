#!/bin/bash
rm -rf build/img

imagemin img/*.* --out-dir=build/img
for i in $(find img/* -type d); do
	imagemin $i/*.* --out-dir=build/$i
done
