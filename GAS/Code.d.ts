/** Global configration object  */
interface Conf {
  baseUrl: string;
  numPosts: number;
  keywords: string[];
  email: {
    recipients: string;
    subject: string;
  };
}

/** A craiglist post object */
interface Post {
  title: string;
  link: string;
  description: string;
  date: Date;
}

/** A craiglist post object */
interface AnnotatedPost extends Post {
  match: RegExpMatchArray;
}
