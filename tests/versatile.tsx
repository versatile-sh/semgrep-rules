import DOMPurify from "dompurify";
import { exec, execFile, spawn } from "node:child_process";

// ruleid: hardcoded-credential-js
const apiKey = "CCCCCCCCCCCCCCCCCCCCCCCC";
// ok: hardcoded-credential-js
const tokenName = "session";

export function Unsafe({ html }: { html: string }) {
  // ruleid: unsanitized-dangerously-set-inner-html-js
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Safe({ html }: { html: string }) {
  // ok: unsanitized-dangerously-set-inner-html-js
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
}

export function list(dir: string) {
  // ruleid: shell-string-exec-js
  exec(`ls ${dir}`);
  // ok: shell-string-exec-js
  exec("ls -la");
  // ok: shell-string-exec-js
  execFile("ls", [dir]);
  // ruleid: shell-string-exec-js
  spawn("ls", [dir], { shell: true });
}

export function handler(req: { headers: Record<string, string>; body: unknown; url: string }) {
  // ruleid: logged-request-secrets-js
  console.log("incoming", req.headers);
  // ruleid: logged-request-secrets-js
  console.info(req.body);
  // ok: logged-request-secrets-js
  console.log("incoming", req.url);
  return [apiKey, tokenName];
}

export function regex(text: string) {
  // ok: shell-string-exec-js
  return /a/.exec(text);
}
