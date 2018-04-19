function doNarouAdd(request) {
  var params = request.text.split(" ")[1].slice(Narou.baseUrl.length).split("/");
  var id = params[0];
  var page = params[1];
  var data = addNarouPage(id, page, request.user);
  return notifyAdd2Slack(data.page, data.title, data.subTitle);
}

/* IDとページをシートに追加する */
function addNarouPage(id, page, user) {
  var sheet = getNarouSheet();
  var title = getNarouTitle(id);
  var subTitle = getNarouSubTitle(id, page);
  return addPage(sheet, id, page, user, title, subTitle);
}

/* 該当IDのタイトルを取得する */
function getNarouTitle(id) {
  try {
    var html = UrlFetchApp.fetch(Narou.baseUrl + id + "/").getContentText();
    var title = Parser.data(html).from('<p class="novel_title">').to('</p>').build();
    return title;
  } catch(e) {
    return null;
  }
}

/* 該当IDとページのサブタイトルを取得する */
function getNarouSubTitle(id, page) {
  try {
    var html = UrlFetchApp.fetch(Narou.baseUrl + id + "/" + page + "/").getContentText();
    var subTitle = Parser.data(html).from('<p class="novel_subtitle">').to('</p>').build();
    return subTitle;
  } catch(e) {
    return null;
  }
}

function doNarouDel(request) {
  var params = request.text.split(" ")[1].slice(Narou.baseUrl.length).split("/");
  var id = params[0];
  var title = delNarouPage(id, request.user);
  return notifyDel2Slack(title);
}

/* 該当IDを削除する */
function delNarouPage(id, user) {
  return delPage(getNarouSheet(), id, user);
}

/* 全ページの更新チェック */
function checkNarouUpdateAll() {
  var sheet = getNarouSheet();
  var data = sheet.getDataRange().getValues();
  for(var i = 0; i < data.length; i++) {
    var id = data[i][0];
    var newPage = data[i][1] + 1;
    if (data[i][5] == true && checkNarouExist(id, newPage) ) {
      var subTitle = getNarouSubTitle(id, newPage);
      var user = data[i][4];
      saveNarouPage(id, newPage, subTitle, user);
      var title = data[i][2];
      var url = Narou.baseUrl + id + "/" + newPage + "/";
      notifyUpdate2Slack(title, user, url);
    }
  }
}

/* 対象ページが存在するかをチェック.存在すればtrueを返す*/
function checkNarouExist(id, page) {
  try {
    var html = UrlFetchApp.fetch(Narou.baseUrl + id + "/" + page + "/");
    return true;
  } catch(e) {
    return false;
  }
}

/* ページとサブタイトルを保存する */
function saveNarouPage(id, page, subTitle, user) {
  savePage(getNarouSheet(), id, page, subTitle, user);
}

/* シートを取得する */
function getNarouSheet() {
  if (getNarouSheet.instance) { return getNarouSheet.instance; }
  var sheet = SpreadsheetApp.openById(Const.spreadSheetId).getSheetByName(Narou.sheetName);
  return sheet;
}
