# 財務モデルの仮定（financial-model.csv の説明）

すべて**仮定**であり、実績ではありません。数式はCSVの各列の意味の通りで、外部スプレッドシートで再計算できます。

- `free_users`: 初月100人、1〜12ヶ月は前月比+25%、13〜24ヶ月は+18%（仮定）
- `conversion_rate_assumption`: 無料→有料 3%/月（保守的仮定）
- `new_paid_from_conversion` = free_users × conversion
- `churn`: 有料の 8%/月（初期は高く、習慣化で下がる想定）
- `paying_users` = 前月有料 + 転換 − 解約
- `ARPU_JPY` = 780（Proの月額）
- `subscription_revenue_JPY` = paying_users × ARPU
- `book_revenue_JPY` = paying_users × 1%/月相当（年1回¥4,800の製本を月割り）
- `payment_fees_JPY` = 総収益 × 3.6%（Stripe想定）
- `variable_cost_JPY` = paying_users × ¥15（同期サーバーの利用料。処理は端末内のためAPI原価なし）
- `fixed_cost_JPY` = ¥1,500/月（サーバー・ツール）
- `gross_profit_JPY` = 総収益 − 決済手数料 − 変動費 − 固定費

**感度**: 転換率2%→黒字化が数ヶ月遅延。解約率5%に改善→有料1000人到達が3ヶ月早まる。
