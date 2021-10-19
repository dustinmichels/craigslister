function test() {
  //   let url = "https://example.com/";
  let url = "https://denver.craigslist.org/search/sss?sort=rel&query=freezer";
  var response = UrlFetchApp.fetch(url);
  let inHtml = response.getContentText("UTF-8");

  const parser = new DOMParser();
  const doc = parser.parseFromString(inHtml, "text/html");
  const xml = new XMLSerializer().serializeToString(doc);

  let document = XmlService.parse(xml);

  Logger.log(document);

  //   Logger.log(response.getAllHeaders());
}
