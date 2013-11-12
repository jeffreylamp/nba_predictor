#!/bin/bash

# Step 0: Move into the right directory
cd /home/ubuntu/nba_predictor
date >> log.txt
# Step 1: Scrape the live NBA scores using the R script
echo Scraping site...
Rscript rt_scrape.R
# make sure we were able to get a file
if [ -a "nba_games_live.csv" ]; then
  # Step 2: Load the results from the CSV file into PostgreSQL
  echo Loading into database...
  psql -d yhat -U greg -f load.sql
  # Step 3: Delete the CSV file so we don't load it again
  echo Removing file...
  rm nba_games_live.csv
fi

