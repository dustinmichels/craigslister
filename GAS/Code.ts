/// <reference path="./Code.d.ts" />

// ------------------------------
// Configuration
// ------------------------------

const CONF: Conf = {
  // valid craigslist search url (in this case computer gigs near Boulder)
  baseUrl:
    "https://boulder.craigslist.org/search/cpg?is_paid=all&nearbyArea=13&nearbyArea=210&nearbyArea=287&nearbyArea=288&nearbyArea=315&nearbyArea=713&searchNearby=2",
  // num posts to scrape, should be a multiple of 25
  numPosts: 100,
  // words to search for (case insensitive)
  keywords: [
    "python",
    "javascript",
    "programming",
    "programmer",
    "scripting",
    "automate",
    "automation",
    "scraping",
    "scraper",
    "data",
    "analysis",
    "analytics",
    "science",
    "files",
    "txt",
    "csv",
    "spreadsheet",
    "excel",
    "google sheets",
    "tutor"
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
  let postData = [];
  let i = 0;
  while (i < CONF.numPosts) {
    let posts = parseUrl(getUrl(i));
    let annotatedPosts = annotatePosts(posts);
    postData = postData.concat(annotatedPosts);
    i += 25;
  }
  logToSheet(postData);
  let chosenPosts = filterAnnotatedPosts(postData);
  sendEmail(chosenPosts);
}

// ------------------------------
// Web scraping
// ------------------------------

/**
 * Build RSS web address, for computer gigs in Boudler & nearby
 * Returns 25 recent posts, starting at index N
 *   N=0  => posts 1-25
 *   N=25 => posts 26-50
 */
function getUrl(n: number) {
  let formatArg = "&format=rss";
  let startArg = "&s=NNN";
  return CONF.baseUrl + formatArg + startArg.replace("NNN", n.toString());
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
    allPosts.push({
      title: info["title"],
      link: info["link"],
      description: info["description"],
      date: info["date"]
    });
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
 * @param data
 */
function logToSheet(data: AnnotatedPost[]) {
  let sheet = SpreadsheetApp.getActiveSheet();

  // transform data
  let dataArr = data.map(post => {
    return [post.date, post.match, post.title, post.description, post.link];
  });
  // let headers = ["date", "match", "title", "description", "link"];
  // dataArr.unshift(headers);

  // write to sheet
  let existingRange = sheet.getDataRange();
  let startRow = existingRange.getNumRows() + 1;
  let range = sheet.getRange(startRow, 1, dataArr.length, dataArr[0].length);
  range.setValues(dataArr);
  return;
}

// ------------------------------
// Send Email
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
  logToSheet(postData);

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
