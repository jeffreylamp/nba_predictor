#!/bin/bash


function leadChange() {
    python -c "import random; print random.randint(-3, 3)"
}


psql -d dev -c "truncate table os_nba_games;"

CNTR=3000
LEAD=0
while [ 1 ]; do
  sql="insert into os_nba_games(team_home, team_away, time_remaining, home_lead, game_id, gamedate) values('HOU', 'LAC', ${CNTR}, ${LEAD}, 'HOU @ LAC', '2013-11-12');"
  psql -d dev -c "${sql}"

  let CNTR-=1
  DELTA=$(leadChange)
  let LEAD=$(echo "${LEAD} + ${DELTA}"| bc)
  sleep .1
done

