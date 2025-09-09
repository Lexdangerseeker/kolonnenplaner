import Document, { Html, Head, Main, NextScript, type DocumentContext } from "next/document";

export default class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initial = await Document.getInitialProps(ctx);
    return { ...initial };
  }
  render() {
    return (
      <Html lang="de">
        <Head>{/* KEIN viewport hier! */}</Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
