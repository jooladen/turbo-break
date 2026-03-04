/**
 * 서버 전용 로거 — console.log / process.stdout.write 대신 사용
 * Node.js 서버 환경에서만 실행되므로 process.stdout 직접 사용
 */
const logger = {
  info: (msg: string) => process.stdout.write(`[INFO] ${msg}\n`),
  warn: (msg: string) => process.stderr.write(`[WARN] ${msg}\n`),
  error: (msg: string) => process.stderr.write(`[ERROR] ${msg}\n`),
};

export default logger;
