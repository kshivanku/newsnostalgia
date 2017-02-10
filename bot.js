var fs = require('fs');
var request = require('request');
var TwitterAPI = require('node-twitter-api');
var config = require('./config.js');

var startingYear = 1852;
var currentYear = 2017;
var newDataPeriod = 1000 * 60 * 60 ; //1 hour
var newTweetPeriod = 1000 * 60 * 5 //5 mins

var twitter = TwitterAPI({
  consumerKey: config.cKey,
  consumerSecret: config.cSecret
});

//QUERY GUARDIAN AND NYT FOR NEW ARTICLES
setInterval(getnewdata, newDataPeriod);
// getnewdata();

function getnewdata(){
  getDataFromNYT();
  getDataFromGuardian();
}

function getDataFromNYT(){
  var year = Math.floor(startingYear + Math.random() * (currentYear - startingYear));
  var month = Math.floor(1 + Math.random()*11);
  console.log("NYT Dates: " + year + "/" + month);
  var url = "https://api.nytimes.com/svc/archive/v1/" + year + "/" + month + ".json";
  request.get({
    url: url,
    qs: {
      'api-key': config.nytAPIkey
    },
  }, function(err, response, result) {
    result = JSON.parse(result);
    var resultData = JSON.stringify(result, null, 2);
    fs.writeFileSync("nytdata.json", resultData);
  })
}

function getDataFromGuardian(){
  var year = Math.floor(startingYear + Math.random() * (currentYear - startingYear));
  var month = Math.floor(1 + Math.random()*11);
  var date = Math.floor(1 + Math.random()*27);
  console.log("Guardian Dates: " + year + "/" + month + "/" + date);
  var page_size = 200;
  var url = "http://content.guardianapis.com/search?from-date=" + year + "-" + month + "-" + date + "&order-by=oldest&page-size=200&api-key=" + config.guardianAPIkey;
  request.get({
    url: url
  }, function(err, response, result) {
    result = JSON.parse(result);
    var resultData = JSON.stringify(result, null, 2);
    fs.writeFileSync("guardiandata.json", resultData);
  })
}

//REGULAR TWEETING
setInterval(tweetNow, newTweetPeriod);
// tweetNow();
function tweetNow(){
  selectPublication("Regular_Tweeting_No_User_Action");
}

function selectPublication(user_name){
  var toss = Math.round(1 + Math.random());
  if(toss == 1){
    tweetNYT(user_name);
  }
  else{
    tweetGD(user_name);
  }
}

function tweetNYT(user_name){
  var NYTdata = JSON.parse(fs.readFileSync("nytdata.json"));
  var article_array = NYTdata.response.docs;
  var article_index = Math.floor(Math.random()*article_array.length);
  var heading = article_array[article_index].headline.main;
  var pubdate = article_array[article_index].pub_date.split("T")[0];
  var weblink = article_array[article_index].web_url;
  tweetIt("NYT", heading, pubdate, weblink, user_name);
}

function tweetGD(user_name){
  var GDdata = JSON.parse(fs.readFileSync("guardiandata.json"));
  var article_array = GDdata.response.results;
  var article_index = Math.floor(Math.random()*article_array.length);
  var heading = article_array[article_index].webTitle;
  var pubdate = article_array[article_index].webPublicationDate.split("T")[0];
  var weblink = article_array[article_index].webUrl;
  tweetIt("Guardian", heading, pubdate, weblink, user_name);
}

function tweetIt(pub, heading, pubdate, weblink, user_name){
  if (user_name == "Regular_Tweeting_No_User_Action"){
    if(pub == "Guardian"){
      var status = pub + ", " + pubdate + ":\n" + weblink;
    }
    else {
      var status = pub + ", " + pubdate + ":\n" + heading + " " + weblink;
    }
    if(status.length > 140){
      status = pub + ", " + pubdate + ":\n" + heading;
      while(status.length > 140) {
        status = status.substring(0, status.length-1);
      }
    }
  }
  else{
    status = "Here's a special article for @" + user_name + " from " + pubdate + "\n" + weblink;
  }
  twitter.statuses("update",
    {"status": status},
    config.accessToken,
    config.tokenSecret,
    function(error, data, response){
      if(error){
        console.log(error);
      }
    }
  );
}

//STREAM FUNCTIONS
twitter.getStream("user", {}, config.accessToken, config.tokenSecret, onData);

function onData(error, streamEvent){
  if(Object.keys(streamEvent).length == 0){
    return;
  }
  else{
    var incoming_data = JSON.stringify(streamEvent, null, 2);
    fs.writeFileSync("incoming_data.json", incoming_data);
    if(streamEvent.hasOwnProperty("event") && streamEvent.event == "follow"){
      selectPublication(streamEvent.source.screen_name);
    }
    else if(streamEvent.hasOwnProperty("text") && streamEvent.user.screen_name!= "newsnostalgia"){
      selectPublication(streamEvent.user.screen_name);
    }
  }
}
