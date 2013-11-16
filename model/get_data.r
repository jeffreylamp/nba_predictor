library(XML)
libarary(ggplot2)

for(i in 1:30) {
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
				intTimeCurrentQ <- as.numeric(unlist(strsplit(vec.time[1], ':'))[1]) * 60 + 
				as.numeric(unlist(strsplit(vec.time[1], ':'))[2])
				intTimeOtherQ <- max((4 - as.numeric(substr(vec.time[2],1,1))) * 12 * 60, 0)
				df.clean$time_remaining[i] <- intTimeCurrentQ + intTimeOtherQ	
				df.clean$home_lead
			}
		}	
	}
	
	df.clean <- df.clean[,c('team_home','team_away','time_remaining','home_lead')]
	
	df.clean$game_id <- paste(df.clean$team_away, ' @ ', df.clean$team_home, sep='')
	df.clean$date <- Sys.Date()
	
	## Or deploy to Yhat?
	df.clean$prob_home_win <- predict(model_simple, newdata=df.clean, type='response');
	
	## Add to full set of data
	df.all <- readRDS('./r_files/tmp_real_time_data.rds')
	df.all <- rbind(df.all, df.clean)
	df.all <- unique(df.all)
	saveRDS(df.all, './r_files/tmp_real_time_data.rds')
	
	Sys.sleep(30)
}
## vec.games will only have the currently active games
vec.games <- unique(df.clean$game_id)

df.plot <- df.all[df.all$game_id == vec.games[3] & df.all$time_remaining>0,]

p <- ggplot(aes(x=-time_remaining, y=prob_home_win), data=df.plot) +
		geom_line() +
		geom_hline(yintercept=0.5) +
		geom_vline(xintercept=(60 * 12 * -4:0), colour="red") +
		ylim(0, 1) +
		scale_x_continuous(breaks=(60 * 12 * -4:0), labels=c("Q1", "Q2", "Q3", "Q4", "END")) +
		ggtitle(df.plot$game_id[1])
p