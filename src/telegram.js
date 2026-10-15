import { createHmac, timingSafeEqual } from "node:crypto";

export function hashCaptchaAnswer(answer, botToken) {
  return createHmac("sha256", botToken).update(String(answer)).digest("hex");
}

export function matchesCaptchaAnswer(answer, answerHash, botToken) {
  const expected = Buffer.from(answerHash, "hex");
  const actual = Buffer.from(hashCaptchaAnswer(answer, botToken), "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createCaptchaQuestion(randomInteger) {
  const left = randomInteger(2, 10);
  const right = randomInteger(1, 10);
  const answer = left + right;
  const options = new Set([answer]);
  while (options.size < 4) options.add(randomInteger(2, 20));

  const shuffled = [...options];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInteger(0, index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return { question: `${left} + ${right} = ?`, answer, options: shuffled };
}
