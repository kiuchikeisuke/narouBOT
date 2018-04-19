function doPost(e) {
  var request = parseRequest(e);
  var msg;
  switch(true) {
    case /^add/.test(request.text):
      msg = doAdd(request);
      break;
    case /^del/.test(request.text):
      msg = doDel(request);
      break;
    case /^list/.test(request.text):
      msg = doList(request);
      break;
    case /^link/.test(request.text):
      msg = doLink(request);
      break;
//    case /^flg/.test(request.text):
//      msg = doFlag(request);
      break;
    default:
      msg = notifyError2Slack("パラメータおかしくね？\n text=" + request.text);
  }
  return encode2Json("ephemeral", msg);
}

function doAdd(request) {
  // request.text="add https://kakuyomu.jp/works/123/episodes/111"
  var url = request.text.split(" ")[1];
  if(url.indexOf(Narou.baseUrl) > -1) {
    return doNarouAdd(request);
  } else if(url.indexOf(Kakuyomu.baseUrl) > -1) {
    return doKakuyomuAdd(request);
  } else {
    return notifyError2Slack("パラメータおかしくね？\n text=" + request.text);
  }
}

function addPage(sheet, id, page, user, title, subTitle) {
  var lastLow = sheet.getLastRow();
  sheet.getRange(lastLow + 1, Const.idColumnIndex).setValue(id);
  sheet.getRange(lastLow + 1, Const.pageColumnIndex).setValue(page);
  sheet.getRange(lastLow + 1, Const.titleColumnIndex).setValue(title);
  sheet.getRange(lastLow + 1, Const.subTitleColumnIndex).setValue(subTitle);
  sheet.getRange(lastLow + 1, Const.userIdColumnIndex).setValue(user);
  sheet.getRange(lastLow + 1, Const.checkUpdateFlagColumnIndex).setValue(true);
  return {
    id: id,
    page: page,
    title: title,
    subTitle: subTitle,
    user: user
  }
}

function doDel(request) {
  var url = request.text.split(" ")[1];
  if(url.indexOf(Narou.baseUrl) > -1) {
    return doNarouDel(request);
  } else if(url.indexOf(Kakuyomu.baseUrl) > -1) {
    return doKakuyomuDel(request);
  } else {
    return notifyError2Slack("パラメータおかしくね？\n text=" + request.text);
  }
}

function delPage(sheet, id, user) {
  var data = sheet.getDataRange().getValues();
  for(var i = 0; i < data.length; i++) {
    if ( data[i][0] == id && data[i][4] == user) {
      var title = data[i][2];
      sheet.deleteRow(i + 1);
      return title;
    }
  }
}

function doList(request) {
  //request.text="list"
  var data = getData(request.user);
  return notifyList2Slack(data);
}

function doLink(request) {
//var user = "U0PAX0RSR"; //debug
//var data = getData(user); //debug
  var data = getData(request.user);
  return notifyLink2Slack(data);
}


//function doFlag(request) {
//  var params = request.text.split(" ");
//  var id = params[1];
//  var updatedFlag = updateFlag(id);
//  var title = getTitle(id);
//}

//function updateFlag(id) {
//  var sheet = getNarouSheet();
//  var data = sheet.getDataRange().getValues();
//  for(var i = 0; i < data.length; i++) {
//    if ( data[i][0] == id && data[i][4] == user) {
//      var title = data[i][2];
//      var currentFlag = data[i][5];
//      sheet.getRange(i + 1,Const.checkUpdateFlagColumnIndex).setValue(!currentFlag);
//      return title;
//    }
//  }
//}

/* 該当ユーザーの登録一覧を取得する */
function getData(user) {
  //var user = "U0PAX0RSR"; debug
  var data = [];
  data = setData(data, user, getNarouSheet(), Narou.baseUrl);
  data = setData(data, user, getKakuyomuSheet(), Kakuyomu.baseUrl);
  return data;
}

function setData(data, user, sheet, baseUrl) {
  var dataAll = sheet.getDataRange().getValues();
  for(var i = 0; i < dataAll.length; i++) {
    if( dataAll[i][4] == user ) {
      if(Narou.baseUrl == baseUrl) {
        dataAll[i][dataAll[i].length] = baseUrl + dataAll[i][0] + "/" + dataAll[i][1] + "/";
      } else if(Kakuyomu.baseUrl == baseUrl) {
        dataAll[i][dataAll[i].length] = baseUrl + dataAll[i][0] + "/episodes/" + dataAll[i][1];
      }
      data.push(dataAll[i]);
    }
  }
  return data;
}

function encode2Json(responseType, msg) {
  var res = {
    "response_type" : responseType,
    "text": msg
  }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}

function parseRequest(e) {
  var request = {};
  request.text = e.parameters["text"][0];
  request.user = e.parameters["user_id"][0];
  return request;
}

function timer() {
  checkNarouUpdateAll();
  checkKakuyomuUpdateAll();
}

function savePage(sheet,id, page, subTitle, user) {
  var data = sheet.getDataRange().getValues();
  for(var i = 0; i < data.length; i++) {
    if ( data[i][0] == id && data[i][4] == user) {
      sheet.getRange(i + 1, Const.pageColumnIndex).setValue(page);
      sheet.getRange(i + 1, Const.subTitleColumnIndex).setValue(subTitle);
      return;
    }
  }
}

function notifyUpdate2Slack(title, user, url) {
  var msg = "<@" + user + ">" + " 【更新あったよ】"+ title +"\n" + url;
  notify2Slack(msg);
}

function notifyAdd2Slack(page, title, subTitle) {
  var msg = "【追加したよ】" + title + "\n" + "ページ=" + page + "\n" + "サブタイ=" + subTitle;
  return msg;
}

function notifyDel2Slack(title) {
  var msg = "【削除したよ】" + title;
  return msg;
}

function notifyFlag2Slack(title, flag) {
  var msg = "【フラグ変えたよ】" + title + "\nflag=" + flag;
  return msg;
}

function notifyList2Slack(data) {
  var msg = "【一覧だよ】\n ```\n";
  for(var i = 0; i < data.length; i++) {
    var id = data[i][0];
    var page = data[i][1];
    var title = data[i][2];
    var subTitle = data[i][3];
    var flag = data[i][5];
    msg += "id=" + id + ", title=" + title + ", subTitle=" + subTitle + ", page=" + page + ", flag=" + flag + "\n";
  }
  msg += "```";
  return msg;
}

function notifyLink2Slack(data) {
  var msg = "【リンクだよ】\n ";
  for(var i = 0; i < data.length; i++) {
    var title = data[i][2];
    var url = data[i][data[i].length -1];
    msg += title + " " + url + "\n";
  }
  return msg;
}

function notifyError2Slack(errorMsg) {
  var msg = "【エラーやで】\n" + errorMsg;
  return msg;
}

function notify2Slack(msg) {
  var slackApp = SlackApp.create(Const.token);
  slackApp.postMessage(Const.channelId, msg, {
    username : "なろう通知",
    icon_emoji : ":books:"
  });
}
