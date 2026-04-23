import { test, expect } from "@playwright/test";

function uniq(prefix: string) {
  const n = Date.now();
  const r = Math.random().toString(16).slice(2, 10);
  return `${prefix}${n}_${r}`;
}

test("回归：注册→建档→登录→开始小测→答题→交卷→结果→辅导", async ({ page, baseURL }) => {
  const username = uniq("e2e_");
  const password = "test1234";
  const nickname = "E2E";

  // 注册
  await page.goto(`${baseURL}/register`);
  await page.getByLabel("角色").selectOption("STUDENT");
  await page.getByLabel("用户名").fill(username);
  await page.getByLabel("密码").fill(password);
  await page.getByLabel("昵称").fill(nickname);
  await page.getByRole("button", { name: "注册" }).click();

  // 建档（等待章节下拉加载）
  await expect(page.getByRole("heading", { name: "建档" })).toBeVisible();
  const chapterSelect = page.getByLabel("当前章");
  await expect(chapterSelect).toBeVisible();
  await expect
    .poll(async () => await chapterSelect.locator("option").count(), { timeout: 15_000 })
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "保存建档" }).click();

  // 登录
  await expect(page.getByRole("heading", { name: "登录" })).toBeVisible();
  await page.getByLabel("用户名").fill(username);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL("**/");
  await expect(page.getByRole("heading", { name: "AI 学习助手" })).toBeVisible();

  // 进入学习地图
  await page.goto(`${baseURL}/map`);
  await expect(page.getByRole("heading", { name: "学习地图" })).toBeVisible();

  // 进入小测（取第一个“进入小测”）
  const enterQuiz = page.getByRole("link", { name: /进入小测/ }).first();
  await expect
    .poll(async () => await page.getByRole("link", { name: /进入小测/ }).count(), { timeout: 15_000 })
    .toBeGreaterThan(0);
  await enterQuiz.click();

  // 开始小测（若没题则换章节重试一次）
  await expect(page.getByRole("heading", { name: "章节小测" })).toBeVisible();
  const startBtn = page.getByRole("button", { name: /新做 20 题|开始中/ }).first();
  await expect(startBtn).toBeVisible();
  await startBtn.click();

  // 可选：题库操作回归（需要配置 AI 才能真正扩题）
  if (process.env.E2E_BANK_TEST === "1") {
    const expandBtn = page.getByRole("button", { name: "扩充题库" });
    if (await expandBtn.isVisible().catch(() => false)) {
      await expandBtn.click();
      await expect(page.getByText(/已扩充题库：/)).toBeVisible({ timeout: 120_000 });
    }
  }

  // 若出现“无题”提示，回到地图换下一个章节
  if (await page.getByText("这个章节暂时没有题目").isVisible().catch(() => false)) {
    await page.goto(`${baseURL}/map`);
    const second = page.getByRole("link", { name: /进入小测/ }).nth(1);
    await second.click();
    await page.getByRole("button", { name: /新做 20 题/ }).first().click();
  }

  // 确认题目出现
  await expect(page.getByText(/第 1\/\d+ 题/)).toBeVisible();

  // 作答：尽量可提交（不保证正确）
  const questionTypeBadge = page.locator("span").filter({ hasText: /SINGLE_CHOICE|FILL_BLANK|PHOTO_SOLUTION/ }).first();
  const qType = (await questionTypeBadge.textContent())?.trim() ?? "";

  if (qType === "SINGLE_CHOICE") {
    await page.locator('input[type="radio"]').first().check();
  } else if (qType === "FILL_BLANK") {
    await page.getByPlaceholder(/填空答案|请输入答案/).fill("0");
  } else if (qType === "PHOTO_SOLUTION") {
    // E2E 不走上传图片（需要本地文件）；直接跳过提交，进入交卷
  }

  // 提交本题（PHOTO_SOLUTION 可能无法提交）
  const submitBtn = page.getByRole("button", { name: "提交本题" });
  if (await submitBtn.isVisible().catch(() => false)) {
    await submitBtn.click();
    // 成功会出现“判题结果”卡片（原始 JSON 在 details 中可展开）
    await expect(page.getByText("判题结果")).toBeVisible();
  }

  // 交卷并进入结果页
  await page.getByRole("button", { name: "交卷" }).click();
  await expect(page.getByRole("heading", { name: "测验结果" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "薄弱点" })).toBeVisible();

  // 开始辅导（若无薄弱点则结束）
  const tutorLink = page.getByRole("link", { name: /开始辅导/ }).first();
  if (await tutorLink.isVisible().catch(() => false)) {
    await tutorLink.click();
    await expect(page.getByRole("heading", { name: "针对性辅导" })).toBeVisible();

    // 练习区至少能看到“练习（3 道…”）
    await expect(page.getByText(/练习（3 道/)).toBeVisible({ timeout: 30_000 });
  }
});

