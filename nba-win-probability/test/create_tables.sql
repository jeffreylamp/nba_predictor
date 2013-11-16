
-- for testing, this was created in 'dev' database
CREATE TABLE os_nba_games (
    _id bigint NOT NULL,
    team_home character varying,
    team_away character varying,
    time_remaining integer,
    home_lead integer,
    game_id character varying,
    gamedate character varying,
    insert_time timestamp without time zone DEFAULT now()
);
