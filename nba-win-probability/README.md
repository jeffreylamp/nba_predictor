## NBA Win Probability

### Quickstart
- install node js: `brew install node`
- install Postgres: `brew install postgresql`
- create a dev database using Postgres: `psql -U postgres -c "create database dev;"`
- clone the repo: `git clone git@github.com:glamp/nba_predictor.git`
- run the `populate_fake_data.sh` in one terminal window
- run the node app in another

```
export PG_URI=postgres://{USERNAME}:{PASSWORD}@{HOST}/{DBNAME}
node app.js
```
