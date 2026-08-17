---
layout: post
title: "[tips][教心] 研究資料處理：Google Sheets 公式筆記"
date: 2026-04-26 15:56:00 +0800
slug: "tips-research-google-sheets-formulas"
tags: ["學習與轉譯工坊"]
lang: "zh-TW"
published: true
---
這篇記錄幾個在處理聆聽實驗資料時用到的 Google Sheets 公式，方便之後複用或修改。

## 公式一：逐字比對答對題數

```
=IF(C3="", 0, ARRAYFORMULA(SUM(--(UPPER(MID(C3, SEQUENCE(LEN(C3)), 1)) = MID("DCD", SEQUENCE(LEN(C3)), 1)))))
```

用途：

逐字比對受試者的填答（C欄）與正確答案字串（此例為 DCD），計算答對幾個字母。

邏輯拆解：
> LEN(C3)：取得填答字串的長度
> MID + SEQUENCE：把字串拆成一個個單字母
> UPPER：統一轉大寫，避免大小寫影響比對
> --( )：把 TRUE/FALSE 轉為 1/0
> SUM：加總答對數
> 外層 IF：確保欄位空白時回傳 0 而非錯誤

⚠️ 正確答案字串 "DCD" 需隨題目手動更新，且填答與正解的字串長度需一致才能正確比對。

## 公式二：依受試者與聆聽材料查找正確答案

```
=IF(ISBLANK(B2),"無法確定",VLOOKUP(A2, '對照表'!$A$9:$D$51, MATCH(B2, '對照表'!$A$9:$D$9, 0), 0))
```

用途：

根據受試者編號（A欄）與該列對應的聆聽材料（B欄，如「白噪音」、「中文 podcast」、「周杰倫」），從「對照表」工作表中動態查找該材料對應欄位的正確答案。

邏輯拆解：

> ISBLANK(B2)：若聆聽材料欄位空白（如尚未填寫的列），回傳「無法確定」
> VLOOKUP：以受試者編號為索引，在正解表 A9:D51 範圍內查找該受試者的那一列
> MATCH(B2, ...$A$9:$D$9, 0)：在正解表的標題列中找到 B2 材料名稱對應的欄號，讓 > VLOOKUP 自動對應到正確答案欄——換材料時不需要手動改欄號

## 公式三：量表文字轉數值

```
=IFS(B2="非常不同意 Strongly Disagree", 0, B2="有點不同意 Somewhat Disagree", 1, B2="不同意 Disagree", 2, B2="同意 Agree", 3, B2="有點同意 Somewhat Agree", 4, B2="非常同意 Strongly Agree", 5)
```

用途：

將李克特量表（Likert Scale）的中英文選項轉換為 0–5 的數值，方便後續統計分析。

⚠️ 此公式未處理空白或非預期值，若受試者未作答會回傳錯誤。可視需要在最後加一條 TRUE, "" 作為預設值。

## 公式四：計算特定條件的平均值

```
=AVERAGEIF(D51:D72,"中文 podcast",E51:E72)
```

用途：

篩選 D 欄中標記為「中文 podcast」的列，計算對應 E 欄數值的平均。

適用情境：

比較不同聆聽材料（白噪音、中文 podcast、周杰倫）之間的分數差異。