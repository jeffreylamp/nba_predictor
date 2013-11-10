library(XML)

	url <- 'http://www.scoresline.com/scores.asp?F=NBA'	
	raw <- readHTMLTable(url,trim=TRUE,stringsAsFactors=FALSE);
	
	df.data <- raw[[10]]
	colnames(df.data) <- c('status','sport','rotation','away_team','away_score','home_team','home_score','status_short')
	
	df.data <- df.data[2:nrow(df.data),]
	df.data$tmp <- 0
	for(i in 1:nrow(df.data)) {
		if(!is.na(df.data$sport[i])) {
			df.data$tmp[i] <- 1
			df.data$status[i] <- df.data$status[i+1]
		}
	}
	
	
	df.clean <- df.data[df.data$tmp==1,]
	df.clean$time_remaining <- 0
	df.clean$home_lead <- as.numeric(df.clean$home_score) - as.numeric(df.clean$away_score)
	df.clean$team_home <- ''
	df.clean$team_away <- ''
	
	for(i in 1:nrow(df.clean)) {
		
		df.clean$team_home[i] <- unlist(strsplit(df.clean$home_team[i], ' \\('))[1]
		df.clean$team_away[i] <- unlist(strsplit(df.clean$away_team[i], ' \\('))[1]
		
		if(df.clean$status[i]=='End Of 1st Half.') {
			df.clean$time_remaining[i] <- 2*60*12
		}
		else if(df.clean$status[i]=='End Of 1st Quarter.') {
			df.clean$time_remaining[i] <- 3*60*12
		}
		else if(df.clean$status[i]=='End Of 3rd Quarter.') {
			df.clean$time_remaining[i] <- 1*60*12
		}
		else {
			vec.time <- unlist(strsplit(df.clean$status[i], ' Remaining In The '))
			if(length(vec.time) > 1) {
				intTimeCurrentQ <- as.numeric(unlist(strsplit(vec.time[1], ':'))[1]) * 60 + as.numeric(unlist(strsplit(vec.time[1], ':'))[2])
				intTimeOtherQ <- max((4 - as.numeric(substr(vec.time[2],1,1))) * 12 * 60, 0)
				df.clean$time_remaining[i] <- intTimeCurrentQ + intTimeOtherQ	
				df.clean$home_lead
			}
		}	
	}
	
	df.clean <- df.clean[,c('team_home','team_away','time_remaining','home_lead')]
	
	df.clean$game_id <- paste(df.clean$team_away, ' @ ', df.clean$team_home, sep='')
	df.clean$date <- Sys.Date()

