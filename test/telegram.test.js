import test from "node:test";
import assert from "node:assert/strict";
import { createCaptchaQuestion, hashCaptchaAnswer, matchesCaptchaAnswer } from "../src/telegram.js";

test("creates a captcha with four unique answers and one correct choice", () => {
  const sequence = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const randomInteger = (min, max) => {
    const value = sequence.shift() ?? min;
    return Math.max(min, Math.min(max - 1, value));
  };
  const captcha = createCaptchaQuestion(randomInteger);
  const [left, right] = captcha.question.match(/\d+/g).map(Number);

  assert.equal(captcha.answer, left + right);
  assert.equal(captcha.options.length, 4);
  assert.equal(new Set(captcha.options).size, 4);
  assert.ok(captcha.options.includes(captcha.answer));
});

test("compares a captcha answer without accepting a different value", () => {
  const token = "test-only-bot-token";
  const answerHash = hashCaptchaAnswer(11, token);

  assert.equal(matchesCaptchaAnswer("11", answerHash, token), true);
  assert.equal(matchesCaptchaAnswer("12", answerHash, token), false);
});
