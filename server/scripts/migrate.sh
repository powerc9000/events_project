#!/bin/bash
set -e
PSQL_OPTS="-h localhost -p 9000 -U postgres"
if [ "$1" = "prod" ]
then
  PSQL_OPTS="-h prod-db.cgzoujjn4lwu.us-east-1.rds.amazonaws.com -U prod_db_user"
fi

DB_NAME="events"
BASEDIR="."

function add-version() {
  psql $PSQL_OPTS -c "insert into migrations (version) values ('$1')" $DB_NAME
}

current_version=$(psql $PSQL_OPTS -XAtc "select version from migrations order by version DESC limit 1" $DB_NAME)


for f in $(ls -1 $BASEDIR/migrations/*.sql | sort); do
  filev=$(basename $f .sql)
  if [[ $filev > $current_version ]]; then
    psql $PSQL_OPTS -X -vON_ERROR_STOP= -1f $f $DB_NAME
    # No need to check return code because of the 'set -e'
    add-version $filev
  fi
done


pg_dump $PSQL_OPTS -s events -O > schema.sql
