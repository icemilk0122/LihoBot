var fs = require('fs'),
  http = require('http'),
  https = require('https'),
  express = require('express'),
  bodyParser = require('body-parser'),
  request = require('request'),
  crypto = require('crypto'),
  FBToken = 'EAADKcEQgTnYBAMahQrUYZBiLAJpKxK9ZBuQ7plWH3QZBN57tSgdyHZBa1TyZCd1jAYQW1pqEpJm2m6JDuoxwSJnbWrpAThNZCKwZA0huawAZA3uRKAYobRqJdIJ0ET0G3aRIpi5ZAtOsxqQT8afdz8gZBSLhpAk23HKtYwEJcZAsLEpigZDZD',
  port = 443,
  options = {
    ca: fs.readFileSync('root-ssl.crt'),
    key: fs.readFileSync('ssl.key'),
    cert: fs.readFileSync('ssl.crt')
  },
  ChannelID = "",
  ChannelSecret = "",
  MID = "",
  app = null,
  server = null;

app = express();

app.use(function(req, res, next) {
  var body = [];
  req.on('data', function(chunk) {
    body.push(chunk);
  }).on('end', function() {
    req.rawBody = Buffer.concat(body);
    body = Buffer.concat(body).toString();
    req.body = JSON.parse(body);
    next();
  });
});


server = https.createServer(options, app).listen(port, function() {
  console.log("Express server listening on port " + port);
});

app.get('/fb/', function(req, res) {
  if (req.query['hub.verify_token'] === FBToken) {
    res.send(req.query['hub.challenge']);
  } else {
    res.send('Error, wrong validation token');
  }
});

app.post('/fb/', function(req, res) {
  messaging_events = req.body.entry[0].messaging;
  for (i = 0; i < messaging_events.length; i++) {
    event = req.body.entry[0].messaging[i];
    sender = event.sender.id;
    var text = "";
    if (event.message && event.message.text) {
      text = event.message.text;
      FBSendTextMessage(sender, boubou(text));
    }
  }
  res.sendStatus(200);
});

app.use('/line', function(req, res) {
  var hmac = crypto.createHmac('SHA256', ChannelSecret);
  hmac.setEncoding('Base64');
  hmac.write(req.rawBody);
  hmac.end();
  var hash = hmac.read();
  if (hash !== req.headers['x-line-channelsignature']) {
    res.sendStatus(404);
  }
  var result = req.body.result[0];
  var content = req.body.result[0].content;
  LineSendTextMessage([content.from], boubou(content.text));
  res.sendStatus(200);
});

function LineSendTextMessage(sender, text) {
  var body = {
    to: sender,
    toChannel: 1383378250,
    eventType: "138311608800106203",
    content: {
      contentType: 1,
      toType: 1,
      text: text
    }
  };
  request({
    uri: "https://trialbot-api.line.me/v1/events",
    method: 'POST',
    headers: {
      "X-Line-ChannelID": ChannelID,
      "X-Line-ChannelSecret": ChannelSecret,
      "X-Line-Trusted-User-With-ACL": MID
    },
    json: body
  }, function(error, response, body) {
    if (error) {
      console.log('Error sending message: ', error);
    }
    console.log(body);
  })
}

function FBSendTextMessage(sender, text) {
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {
      access_token: FBToken
    },
    method: 'POST',
    json: {
      recipient: {
        id: sender
      },
      message: {
        text: text
      },
    }
  }, function(error, response, body) {
    if (error) {
      console.log('Error sending message: ', error);
    } else if (response.body.error) {
      console.log('Error: ', response.body.error);
    }
  });
}

function boubou(text) {
  match = text.match(/寶寶[還你妳]?(知道|喜歡|討厭|愛吃)(.*)嗎[\?？]?/i);
  if (match) {
    var verb = match[1]
    var word = match[2]
    return "寶寶" + verb + word + "，只是寶寶不說";
  }

  match = text.match(/寶寶[還你妳]好嗎[\?？]?/i);
  if (match) {
    return "寶寶心裡苦，只是寶寶不說";
  }
  match = text.match(/.*[好太真很]?(可怕|恐怖|詭異|奇怪)啊?.*/i);
  if (match) {
    return "嚇死寶寶了";
  }

  return "寶寶聽不懂";
}
