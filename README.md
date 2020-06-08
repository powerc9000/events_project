A monlithic nodejs app for creating events and inviting people to them.

# Requirements

* Docker
* Postmark for email
* Textbelt for texts
* Some postgres server
* Some redis server

The dev version of this should be able to install and run everything you need.
Type `make dev-up` to start it.

## Migrations
The database uses some stupid migrations thing I made. After the dev postgres db is up run the migrations
`./scripts/migrate`

Should all be running on localhost:8000
