pg = require 'pg'

module.exports = (conString) ->
  execQuery = (q, fn) ->
    pg.connect conString, (err, db, done) ->
      return console.error("could not connect to postgres", err)  if err
      db.query q, (err, result) ->
        done()
        return console.error("error running query", err)  if err
        fn null, result.rows
  {

    getGameData: (firstId, fn) ->
      d1 = new Date()
      d = d1.getFullYear() + "-" + (d1.getMonth() + 1) + "-" + d1.getDate()
      q = "select * from os_nba_games where _id > #{firstId} and gamedate >= '#{d}';"
      execQuery(q, fn)

    gameById: (_id, fn) ->
      if not /^[0-9]+$/.test(_id)
        return fn("incorrect _id format", null)

      query = """
      select
        distinct
          s._id as game_id
          , s.gamedate
          , t1.full_name as visitor
          , t2.full_name as home
          , g.time_remaining as time_remaining
          , home_lead 
      from
          os_nba_schedule s
      inner join
          os_nba_teams t1
              on s.visitor = t1.full_name
      inner join
          os_nba_teams t2
              on s.home = t2.full_name
      inner join
          os_nba_games g
              on t1.short_name || ' @ ' || t2.short_name = g.game_id
              -- windows for time zones. assume same 2 teams aren't playing on consecutive days
              and g.gamedate::date between s.gamedate::date - 1 and s.gamedate::date + 1
              and g.time_remaining > 0
              and s._id = #{_id}
      order by
          s._id desc
          , g.time_remaining desc;
      """
      execQuery(query, fn)


    gamesForDate: (aDate, fn) ->
      try
        d = Date.parse aDate
        if isNaN(d)
          return fn("invalid date was supplied", null)
      catch e
        return fn(e.toString(), null)
      
      query = """
      select
        distinct
          s._id as game_id
          , s.gamedate
          , t1.full_name as visitor
          , t2.full_name as home
          , g.time_remaining as time_remaining
          , home_lead 
      from
          os_nba_schedule s
      inner join
          os_nba_teams t1
              on s.visitor = t1.full_name
      inner join
          os_nba_teams t2
              on s.home = t2.full_name
      inner join
          os_nba_games g
              on t1.short_name || ' @ ' || t2.short_name = g.game_id
              -- windows for time zones. assume same 2 teams aren't playing on consecutive days
              and g.gamedate::date between s.gamedate::date - 1 and s.gamedate::date + 1
              and g.time_remaining > 0
              and s.gamedate = '#{aDate}'
      order by
          s._id desc
          , g.time_remaining desc;
      """
      execQuery(query, fn)


    gameIdsForDate: (aDate, fn) ->
      try
        d = Date.parse aDate
        if isNaN(d)
          return fn("invalid date was supplied", null)
      catch e
        return fn(e.toString(), null)
      
      query = """
      select
        distinct
          s._id
      from
          os_nba_schedule s
      inner join
          os_nba_teams t1
              on s.visitor = t1.full_name
      inner join
          os_nba_teams t2
              on s.home = t2.full_name
      inner join
          os_nba_games g
              on t1.short_name || ' @ ' || t2.short_name = g.game_id
              -- windows for time zones. assume same 2 teams aren't playing on consecutive days
              and g.gamedate::date between s.gamedate::date - 1 and s.gamedate::date + 1
              and g.time_remaining > 0
              and s.gamedate = '#{aDate}'
      order by
          s._id desc
      """
      execQuery(query, fn)
    }
