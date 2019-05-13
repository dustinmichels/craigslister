/// <reference path="./Code.d.ts" />

// ------------------------------
// Configuration
// ------------------------------

const CONF: Conf = {
  // valid craigslist search url (in this case computer gigs in Boulder and nearby areas)
  baseUrl:
    "https://boulder.craigslist.org/search/cpg?nearbyArea=13&nearbyArea=210&nearbyArea=287&nearbyArea=288&nearbyArea=315&nearbyArea=713&searchNearby=2",
  // num posts to scrape, should be a multiple of 25
  numPosts: 50,
  // words to search for (case insensitive)
  keywords: [
    "analysis",
    "analytics",
    "app",
    "automate",
    "automation",
    "css",
    "csv",
    "data",
    "data",
    "files",
    "html",
    "javascript",
    "programmer",
    "programming",
    "python",
    "science",
    "scraper",
    "scraping",
    "scripting",
    "spreadsheet",
    "statistics",
    "tutor",
    "txt",
    "visualization",
    "website",
    "xml"
  ],
  // email setings
  email: {
    recipients: "dustin7538@gmail.com,", // comma seperated list of recipients
    subject: "Craigslist Postings" // email subject line
  }
};

// ------------------------------
// Run program
// ------------------------------

/**
 * Scrape & filter craigslist posts,
 * then send relevant posts in email
 */
function main() {
  // get data
  let postData = [];
  let i = 0;
  while (i < CONF.numPosts) {
    let posts = parseUrl(getUrl(i));
    let annotatedPosts = annotatePosts(posts);
    postData = postData.concat(annotatedPosts);
    i += 25;
  }

  // choose relevant posts
  let chosenPosts = filterAnnotatedPosts(postData);
  Logger.log(">> Chose %s / %s posts", chosenPosts.length, postData.length);

  // log to sheet
  logToSheet(postData);
  Logger.log(">> Logging data to sheet");
  if (!isEmpty(chosenPosts)) {
    Logger.log(">> Emailing chosen posts");
    sendEmail(chosenPosts);
  } else {
    Logger.log(">> Not emailing - no posts chosen");
  }
}

// ------------------------------
// Web scraping
// ------------------------------

/**
 * Build RSS web address, for computer gigs in Boudler & nearby
 * Returns 25 recent posts, starting at index n
 *   n=0  => posts 1-25
 *   n=25 => posts 26-50
 */
function getUrl(n: number) {
  return (
    CONF.baseUrl +
    "&format=rss" + // rss format
    "&is_paid=all" + // paid [yes, no, all]
    "&s=NNN".replace("NNN", n.toString()) + // starting index
    "&postedToday=1" // posted today only
  );
}

/** Get posts from url **/
function parseUrl(url: string): Post[] {
  let xml = UrlFetchApp.fetch(url).getContentText();
  return parseContent(xml);
}

/** Build list with post info from each post on page **/
function parseContent(xml: string): Post[] {
  let allPosts = [];
  let purlNamespace = XmlService.getNamespace("http://purl.org/rss/1.0/");
  let root = XmlService.parse(xml).getRootElement();
  let items = root.getChildren("item", purlNamespace);
  for (let item of items) {
    // extract relevant info from children
    let info = {};
    let children = item.getChildren();
    children.forEach(child => {
      info[child.getName()] = child.getText();
    });
    // construct "post" object, add to list
    let post = <Post>{
      title: info["title"],
      link: info["link"],
      description: info["description"],
      listedDate: new Date(info["date"]),
      scrapedDate: new Date()
    };
    allPosts.push(post);
  }
  return allPosts;
}

// ------------------------------
// Filtering
// ------------------------------

/** Check if post looks relevant */
function isRelevant(post: Post) {
  let re = new RegExp(CONF.keywords.join("|"), "ig");
  let titleMatch = post.title.match(re);
  let descMatch = post.description.match(re);
  return titleMatch || descMatch;
}

/** Annotate post objects with "match" field */
function annotatePosts(posts: Post[]): AnnotatedPost[] {
  let annPosts = posts.map(post => {
    let match = isRelevant(post);
    return { match: match, ...post };
  });
  return annPosts;
}

/** Filter posts to only those that were a match */
function filterAnnotatedPosts(posts: AnnotatedPost[]) {
  return posts.filter(function(p) {
    return p.match;
  });
}

// ------------------------------
// Logging
// ------------------------------

/**
 * Log data to Google Sheet for further analysis / review
 */
function logToSheet(data: AnnotatedPost[]) {
  return _logToSheet(data, 0);
}

/**
 * Log test data to test sheet
 */
function logToTestSheet(data: AnnotatedPost[]) {
  return _logToSheet(data, 1);
}

/**
 * Logs data to specified sheeet (0=main, 1=test)
 */
function _logToSheet(data: AnnotatedPost[], sheetIdx: number) {
  if (data.length === 0) {
    Logger.log("no data, not logging");
    return;
  }
  let sheet = SpreadsheetApp.getActive().getSheets()[sheetIdx];
  // transform data
  let dataArr = data.map(post => {
    return [
      post.scrapedDate,
      post.match,
      post.listedDate,
      post.title,
      post.description,
      post.link
    ];
  });
  // write to sheet
  let existingRange = sheet.getDataRange();
  let startRow = existingRange.getNumRows() + 1;
  let startCol = 1;
  let range = sheet.getRange(
    startRow,
    startCol,
    dataArr.length,
    dataArr[0].length
  );
  range.setValues(dataArr);
  return;
}

// ------------------------------
// Email
// ------------------------------

/** Send email */
function sendEmail(postData: Post[]) {
  let body = getHtmlBody_(postData);
  let email = CONF.email;
  GmailApp.sendEmail(email.recipients, email.subject, body, {
    htmlBody: getHtmlBody_(postData)
  });
}

/** Create html string from email.html template */
function getHtmlBody_(postData: Post[]) {
  let t = HtmlService.createTemplateFromFile("email");
  t["data"] = postData;
  return t.evaluate().getContent();
}

// ------------------------------
// Helper
// ------------------------------

/** Check if array is empty */
function isEmpty(obj: object) {
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) return false;
  }
  return true;
}

// ------------------------------
// Testing
// ------------------------------

/**
 * Test scraping and filtering functions
 * Use saved XML files, rather than scraping page.
 */
function test() {
  let samplePages = ["samplePage", "samplePage2"];
  let postData = [];
  // Iterate over sample pages
  samplePages.forEach(page => {
    let xml = HtmlService.createHtmlOutputFromFile(page).getContent();
    let posts = parseContent(xml);
    let annotatedPosts = annotatePosts(posts);
    postData = postData.concat(annotatedPosts);
  });
  logToTestSheet(postData);

  // filter for matching posts
  let chosenPosts = filterAnnotatedPosts(postData);
  // Print out results
  Logger.log(
    "Selected %s / %s posts",
    chosenPosts.length,
    25 * samplePages.length
  );
  for (let i = 0; i < chosenPosts.length; i++) {
    Logger.log("%s) %s", i + 1, chosenPosts[i].title);
  }
  return chosenPosts;
}

/** Test scraper & send email */
function testWithEmail() {
  let data = test();
  sendEmail(data);
}
