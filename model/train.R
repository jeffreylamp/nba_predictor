

df <- readRDS("~/Downloads/win_prob.rds")
head(df)

df$home_lead <- -df$away_lead
df$home_win <- 1 - df$away_win
idx <- sample(1:nrow(df), 100000)

fit <- glm(home_win ~ home_lead*time_remaining, data=df[idx,], family=binomial())


model.require <- function() { }
model.transform <- function(df) {
  df
}
model.predict <- function(df) {
  df$pred <- predict(fit, df, type="response")
  df
}
rm(df)
library(yhatr)
yhat.config <- c(username="greg", apikey="one",
                 env="http://yhat-aa02a554-732313416.us-west-1.elb.amazonaws.com/deployer/")

yhat.deploy("nbaPredictor")

predict(fit, df, type="response")
hist(predict(fit, newdata=df, type="response"))
