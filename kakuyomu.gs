function doKakuyomuAdd(request) {
  var params = request.text.split(" ")[1].slice(Kakuyomu.baseUrl.length).split("/");
  var id = params[0];
  var page = params[2];
  var data = addKakuyomuPage(id, page, request.user);
  return notifyAdd2Slack(data.page, data.title, data.subTitle);
}

/* IDとページをシートに追加する */
function addKakuyomuPage(id, page, user) {
  var sheet = getKakuyomuSheet();
  var title = getKakuyomuTitle(id);
  var subTitle = getKakuyomuSubTitle(id, page);
  return addPage(sheet, id, page, user, title, subTitle);
}

/* 該当IDのタイトルを取得する */
function getKakuyomuTitle(id) {
  try {
    var html = UrlFetchApp.fetch(Kakuyomu.baseUrl + id).getContentText();
    var title = Parser.data(html).from('<title>').to('</title>').build();
    return title;
  } catch(e) {
    return null;
  }
}

/* 該当IDとページのサブタイトルを取得する */
function getKakuyomuSubTitle(id, page) {
  try {
    var html = UrlFetchApp.fetch(Kakuyomu.baseUrl + id + "/episodes/" + page).getContentText();
    var subTitle = Parser.data(html).from('<p class="widget-episodeTitle">').to('</p>').build();
    return subTitle;
  } catch(e) {
    return null;
  }
}

function doKakuyomuDel(request) {
  var params = request.text.split(" ")[1].slice(Kakuyomu.baseUrl.length).split("/");
  var id = params[0];
  var title = delKakuyomuPage(id, request.user);
  return notifyDel2Slack(title);
}

/* 該当IDを削除する */
function delKakuyomuPage(id, user) {
  return delPage(getKakuyomuSheet(), id, user);
}

function checkKakuyomuUpdateAll() {
  var sheet = getKakuyomuSheet();
  var data = sheet.getDataRange().getValues();
  
  for(var i = 0; i < data.length; i++) {
    var id = data[i][0];
    var parentUrl = Kakuyomu.baseUrl + id;
    var html = UrlFetchApp.fetch(parentUrl).getContentText();
    var episodesHtml = Parser.data(html).from('<li class="widget-toc-episode">').to('</li>').iterate();
    
    var latestEpisodeHtml = episodesHtml[episodesHtml.length - 1];
    var params = latestEpisodeHtml.match(/<a href=".+">/);
    var param = params[0];
    var items = param.split(" ");
    var hrefItem = null;
    for each(var item in items) {
      if(item.match(/href=".+"/)) {
           hrefItem = item;
      }
    }
    if (hrefItem == null) {
      continue;
    }
    var page = hrefItem.substring('href=\"'.length, hrefItem.length - '\"'.length).split("/")[4];
    if(data[i][5] == true && data[i][1] != page) {
      var user = data[i][4];
      var title = data[i][2];
      params = latestEpisodeHtml.match(/<span class="widget-toc-episode-titleLabel js-vertical-composition-item">.+<\/span>/);
      param = params[0];
      var subTitle = param.substring('<span class="widget-toc-episode-titleLabel js-vertical-composition-item">'.length,param.length - '</span>'.length);
      var url = Kakuyomu.baseUrl + id + "/episodes/" + page;
      saveKakuyomuPage(id, page, subTitle, user);
      
      notifyUpdate2Slack(title, user, url);
    }
  }
}

function saveKakuyomuPage(id, page, subTitle, user) {
  savePage(getKakuyomuSheet(), id, page, subTitle, user);
}

function getKakuyomuSheet() {
  if (getKakuyomuSheet.instance) { return getKakuyomuSheet.instance; }
  var sheet = SpreadsheetApp.openById(Const.spreadSheetId).getSheetByName(Kakuyomu.sheetName);
  return sheet;
}
