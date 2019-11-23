con='-q -X  -h localhost -p 9000 -U postgres events'
email="clay.murray8+testcappy@gmail.com"
del="select id from users where email = '$email'"

psql $con -c "delete from logins where user_id in ($del)"
psql $con -c "delete from invites where user_id in ($del)"
psql $con -c "delete from comments where user_id in ($del)"
psql $con -c "delete from events where creator in ($del)"
psql $con -c "delete from group_members where user_id in ($del)"
psql $con -c "delete from groups where creator in ($del)"
psql $con -c "delete from group_members where user_id in ($del)"
psql $con -c "delete from validations where user_id in ($del)"
psql $con -c "delete from users where email = '$email'"

rm cookie.txt
