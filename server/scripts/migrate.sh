#!/bin/bash
set -e
PSQL_OPTS="-h localhost -p 9000 -U postgres"
DB_NAME="events"
if [ "$1" = "prod" ]
then
  echo -n Password:
  read -s password
  export PGPASSWORD=$password
  PSQL_OPTS="-h occasions-db-do-user-4391150-0.db.ondigitalocean.com -p 25060 -U juniper"
  DB_NAME='occasions'
fi

BASEDIR="."

function add-version() {
  psql --set=sslmode=require $PSQL_OPTS -c "insert into migrations (version) values ('$1')" $DB_NAME
}

current_version=$(psql --set=sslmode=require $PSQL_OPTS -XAtc "select version from migrations order by version DESC limit 1" $DB_NAME)


for f in $(ls -1 $BASEDIR/migrations/*.sql | sort); do
  filev=$(basename $f .sql)
  if [[ $filev > $current_version ]]; then
    psql $PSQL_OPTS -X -vON_ERROR_STOP= -1f $f $DB_NAME
    # No need to check return code because of the 'set -e'
    add-version $filev
  fi
done

if [ "$1" != "prod" ] 
then
pg_dump $PSQL_OPTS -s events -O > schema.sql
fi
