#!/bin/bash

con='-Xq -A -h localhost -p 9000 -U postgres events -t'
id=`psql $con -c "insert into users (name, email) VALUES('test', 'clay.murray8+testcappy@gmail.com') returning id"`
token=`psql $con -c "insert into logins (user_id, expires) values ('$id', now() + interval '2w') returning id"`
time=$(gdate -d "now + 2 hours" +%s%3N)
echo -n '{"token": {"id": '"\"$token\""', "expires": '"\"$time\""'}}' | base64 > cookie.txt
